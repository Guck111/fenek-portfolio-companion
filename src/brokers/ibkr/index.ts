import type { Account } from "../../domain/account.js"
import type { Dividend } from "../../domain/dividend.js"
import type { Money } from "../../domain/money.js"
import type { Page } from "../../domain/pagination.js"
import type { Position } from "../../domain/position.js"
import type { Transaction, TransactionKind } from "../../domain/transaction.js"
import { ValidationError } from "../../utils/errors.js"
import type { BrokerCapabilities, BrokerConfig, IBroker } from "../base.js"

import { IbkrFlexClient } from "./client.js"
import {
  AccountInformation,
  CashReportCurrencyRow,
  CashTransaction,
  EquitySummaryRow,
  OpenPosition,
  Trade,
  type AccountInformation as AccountInformationType,
  type CashTransaction as CashTransactionType,
  type EquitySummaryRow as EquitySummaryRowType,
  type OpenPosition as OpenPositionType,
  type Trade as TradeType,
} from "./schemas.js"
import { childrenNamed, extractStatements, firstNamed, type XmlElement } from "./xml.js"
import type { z } from "zod"

const BROKER_ID = "ibkr"
const BROKER_NAME = "Interactive Brokers"
// Flex statements are end-of-day reporting data, so one statement feeds every tool;
// re-fetching within a session adds load against a throttled endpoint for no fresher
// data. A short in-process TTL serves all tools from a single round-trip.
const STATEMENT_CACHE_TTL_MS = 15 * 60 * 1000

// Raw IBKR trade — Trades have no clean target in the normalized Transaction model
// (no buy/sell kind), so they are exposed verbatim via the broker-specific tool.
export interface IbkrTrade {
  readonly symbol: string
  readonly buySell?: string
  readonly quantity: number
  readonly tradePrice: number
  readonly ibCommission?: number
  readonly netCash?: number
  readonly fifoPnlRealized?: number
  readonly currency: string
  readonly dateTime?: string
  readonly description?: string
  readonly assetCategory?: string
}

export interface StatementMeta {
  readonly accountId: string
  readonly fromDate?: string
  readonly toDate?: string
  readonly whenGenerated?: string
}

export interface ParsedFlexStatement {
  readonly meta: StatementMeta
  readonly account: Account
  readonly positions: readonly Position[]
  readonly dividends: readonly Dividend[]
  readonly transactions: readonly Transaction[]
  readonly trades: readonly IbkrTrade[]
}

function money(amount: number, currency: string): Money {
  return { amount, currency }
}

// The date portion of a Flex dateTime (`yyyyMMdd;HHmmss`, or with a space/comma/T
// separator) — used to pair a withholding-tax row to its dividend.
function dateKey(dateTime: string | undefined): string {
  if (dateTime === undefined) return ""
  const separatorIndex = dateTime.search(/[;,\sT]/)
  return separatorIndex === -1 ? dateTime : dateTime.slice(0, separatorIndex)
}

export function mapPosition(p: OpenPositionType): Position {
  return {
    brokerId: BROKER_ID,
    ticker: p.symbol,
    instrumentId: p.conid ?? p.symbol,
    ...(p.description !== undefined ? { name: p.description } : {}),
    currency: p.currency,
    quantity: p.position,
    ...(p.costBasisPrice !== undefined
      ? { averagePrice: money(p.costBasisPrice, p.currency) }
      : {}),
    currentPrice: money(p.markPrice, p.currency),
    marketValue: money(p.positionValue, p.currency),
    ...(p.fifoPnlUnrealized !== undefined
      ? { unrealizedPnL: money(p.fifoPnlUnrealized, p.currency) }
      : {}),
  }
}

function latestEquityRow(rows: readonly EquitySummaryRowType[]): EquitySummaryRowType | undefined {
  let latest: EquitySummaryRowType | undefined
  for (const row of rows) {
    if (latest === undefined || row.reportDate > latest.reportDate) latest = row
  }
  return latest
}

export function mapAccount(
  info: AccountInformationType,
  equityRows: readonly EquitySummaryRowType[],
  cashRows: readonly CashReportCurrencyRow[],
): Account {
  // Fall back through base-summary cash if AccountInformation omits the currency
  // code; ultimately default to USD (flagged unverified in the spec).
  const currency = info.currency ?? "USD"
  const equity = latestEquityRow(equityRows)
  const baseSummary = cashRows.find((row) => row.currency === "BASE_SUMMARY")
  const cashAmount = equity?.cash ?? baseSummary?.endingCash ?? 0
  return {
    brokerId: BROKER_ID,
    accountId: info.accountId,
    currency,
    cash: money(cashAmount, currency),
    // Prefer the equity-summary NAV; if that section is absent fall back to cash so
    // the account never reports a 0 total while holding cash (which would understate
    // the cross-broker overview). A correctly configured Flex Query includes NAV.
    totalValue: money(equity?.total ?? cashAmount, currency),
    ...(equity?.stock !== undefined ? { invested: money(equity.stock, currency) } : {}),
  }
}

const DIVIDEND_TYPES = new Set(["Dividends", "Payment In Lieu Of Dividends"])
const WITHHOLDING_TYPE = "Withholding Tax"

// Pairing key for a withholding-tax row and its dividend: symbol + date + currency.
// Currency is part of the key so a tax in a different currency never nets against
// the dividend (the server never silently sums across currencies).
function pairingKey(row: CashTransactionType): string {
  return `${row.symbol ?? ""}|${dateKey(row.dateTime)}|${row.currency}`
}

function classifyTransactionKind(type: string, amount: number): TransactionKind {
  if (type === "Deposits & Withdrawals") return amount >= 0 ? "deposit" : "withdrawal"
  if (type.includes("Interest")) return "interest"
  if (type.includes("Fee") || type === "Commission Adjustments") return "fee"
  return "other"
}

// Splits cash-transaction rows into dividends and (non-dividend) transactions in a
// single pass. A withholding-tax row is netted into its matching dividend; a tax row
// with NO matching dividend in the statement (e.g. the dividend settled in a prior
// Flex period, or a standalone reversal) is surfaced as a transaction rather than
// silently dropped from both outputs.
export function mapCashActivity(rows: readonly CashTransactionType[]): {
  readonly dividends: readonly Dividend[]
  readonly transactions: readonly Transaction[]
} {
  const taxesByKey = new Map<string, CashTransactionType[]>()
  for (const row of rows) {
    if (row.type !== WITHHOLDING_TYPE) continue
    const key = pairingKey(row)
    const bucket = taxesByKey.get(key)
    if (bucket === undefined) taxesByKey.set(key, [row])
    else bucket.push(row)
  }

  const consumedTax = new Set<CashTransactionType>()
  const dividends: Dividend[] = []
  for (const row of rows) {
    if (!DIVIDEND_TYPES.has(row.type)) continue
    const tax = taxesByKey.get(pairingKey(row))?.shift()
    if (tax !== undefined) consumedTax.add(tax)
    const taxAmount = tax?.amount ?? 0
    const currency = row.currency
    dividends.push({
      brokerId: BROKER_ID,
      id: row.transactionID ?? `${row.symbol ?? "DIV"}-${row.dateTime ?? ""}`,
      ticker: row.symbol ?? "",
      instrumentId: row.conid ?? row.symbol ?? "",
      ...(row.description !== undefined ? { name: row.description } : {}),
      grossAmount: money(row.amount, currency),
      netAmount: money(row.amount + taxAmount, currency),
      // taxWithheld is the amount ACTUALLY withheld: only a negative tax row is a
      // charge. A positive (refund/reversal) row raises net pay and withholds nothing.
      ...(taxAmount < 0 ? { taxWithheld: money(-taxAmount, currency) } : {}),
      paidDate: row.dateTime ?? row.settleDate ?? "",
      kind: row.type,
    })
  }

  const transactions: Transaction[] = []
  for (const row of rows) {
    if (DIVIDEND_TYPES.has(row.type)) continue
    if (row.type === WITHHOLDING_TYPE && consumedTax.has(row)) continue
    transactions.push({
      brokerId: BROKER_ID,
      id: row.transactionID ?? `${row.type}-${row.dateTime ?? ""}`,
      kind: classifyTransactionKind(row.type, row.amount),
      amount: money(row.amount, row.currency),
      date: row.dateTime ?? row.settleDate ?? "",
      ...(row.description !== undefined ? { description: row.description } : {}),
    })
  }

  return { dividends, transactions }
}

export function mapTrade(t: TradeType): IbkrTrade {
  return {
    symbol: t.symbol,
    ...(t.buySell !== undefined ? { buySell: t.buySell } : {}),
    quantity: t.quantity,
    tradePrice: t.tradePrice,
    ...(t.ibCommission !== undefined ? { ibCommission: t.ibCommission } : {}),
    ...(t.netCash !== undefined ? { netCash: t.netCash } : {}),
    ...(t.fifoPnlRealized !== undefined ? { fifoPnlRealized: t.fifoPnlRealized } : {}),
    currency: t.currency,
    ...(t.dateTime !== undefined ? { dateTime: t.dateTime } : {}),
    ...(t.description !== undefined ? { description: t.description } : {}),
    ...(t.assetCategory !== undefined ? { assetCategory: t.assetCategory } : {}),
  }
}

function sectionRows<T>(
  statement: XmlElement,
  sectionTag: string,
  rowTag: string,
  schema: z.ZodType<T>,
): readonly T[] {
  const section = firstNamed(statement, sectionTag)
  if (section === undefined) return []
  return childrenNamed(section, rowTag).map((element) => {
    const parsed = schema.safeParse(element.attrs)
    if (!parsed.success) {
      throw new ValidationError(`IBKR Flex: invalid ${rowTag} row: ${parsed.error.message}`, {
        cause: parsed.error,
      })
    }
    return parsed.data
  })
}

export function buildStatement(xml: string): ParsedFlexStatement {
  const statements = extractStatements(xml)
  if (statements.length > 1) {
    const ids = statements.map((s) => s.attrs["accountId"] ?? "?").join(", ")
    throw new Error(
      `Your IBKR Flex Query returns ${String(statements.length)} accounts (${ids}). Fenek reads one account at a time — edit the Flex Query in Client Portal to cover a single account, then retry.`,
    )
  }
  const statement = statements[0]
  if (statement === undefined) {
    throw new ValidationError("IBKR Flex: response contained no statement")
  }

  const infoElement = firstNamed(statement, "AccountInformation")
  const info: AccountInformationType =
    infoElement !== undefined
      ? AccountInformation.parse(infoElement.attrs)
      : { accountId: statement.attrs["accountId"] ?? "unknown" }
  const equityRows = sectionRows(
    statement,
    "EquitySummaryInBase",
    "EquitySummaryByReportDateInBase",
    EquitySummaryRow,
  )
  const cashRows = sectionRows(statement, "CashReport", "CashReportCurrency", CashReportCurrencyRow)
  const positionRows = sectionRows(statement, "OpenPositions", "OpenPosition", OpenPosition)
  const cashTxRows = sectionRows(statement, "CashTransactions", "CashTransaction", CashTransaction)
  const tradeRows = sectionRows(statement, "Trades", "Trade", Trade)

  const meta: StatementMeta = {
    accountId: info.accountId,
    ...(statement.attrs["fromDate"] !== undefined ? { fromDate: statement.attrs["fromDate"] } : {}),
    ...(statement.attrs["toDate"] !== undefined ? { toDate: statement.attrs["toDate"] } : {}),
    ...(statement.attrs["whenGenerated"] !== undefined
      ? { whenGenerated: statement.attrs["whenGenerated"] }
      : {}),
  }

  const cashActivity = mapCashActivity(cashTxRows)
  return {
    meta,
    account: mapAccount(info, equityRows, cashRows),
    positions: positionRows.map(mapPosition),
    dividends: cashActivity.dividends,
    transactions: cashActivity.transactions,
    trades: tradeRows.map(mapTrade),
  }
}

export class IbkrBroker implements IBroker {
  readonly id = BROKER_ID
  readonly name = BROKER_NAME
  readonly capabilities: BrokerCapabilities = {
    pies: false,
    dividends: true,
    transactions: true,
  }
  // No `tier` → free (classic broker).

  private client: IbkrFlexClient | null = null
  private cached: ParsedFlexStatement | null = null
  private loadedAt: number | null = null

  authenticate(config: BrokerConfig): Promise<void> {
    const token = config.credentials["IBKR_FLEX_TOKEN"]
    const queryId = config.credentials["IBKR_FLEX_QUERY_ID"]
    if (token === undefined || queryId === undefined) {
      return Promise.reject(
        new Error("IBKR_FLEX_TOKEN and IBKR_FLEX_QUERY_ID are required in credentials"),
      )
    }
    this.client = new IbkrFlexClient({ token, queryId })
    return Promise.resolve()
  }

  async getAccount(): Promise<Account> {
    return (await this.ensureStatement()).account
  }

  async getPositions(): Promise<readonly Position[]> {
    return (await this.ensureStatement()).positions
  }

  async getTransactions(): Promise<Page<Transaction>> {
    return { items: (await this.ensureStatement()).transactions, hasMore: false }
  }

  async getDividends(): Promise<Page<Dividend>> {
    return { items: (await this.ensureStatement()).dividends, hasMore: false }
  }

  async getTrades(): Promise<readonly IbkrTrade[]> {
    return (await this.ensureStatement()).trades
  }

  async getStatementMeta(): Promise<StatementMeta> {
    return (await this.ensureStatement()).meta
  }

  private async ensureStatement(): Promise<ParsedFlexStatement> {
    const loadedAt = this.loadedAt
    if (
      this.cached !== null &&
      loadedAt !== null &&
      Date.now() - loadedAt < STATEMENT_CACHE_TTL_MS
    ) {
      return this.cached
    }
    if (this.client === null) {
      throw new Error("IBKR broker is not authenticated. Call authenticate() first.")
    }
    const statement = buildStatement(await this.client.fetchStatementXml())
    this.cached = statement
    this.loadedAt = Date.now()
    return statement
  }
}
