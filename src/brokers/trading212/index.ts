import { z } from "zod"

import type { Account } from "../../domain/account.js"
import type { Dividend } from "../../domain/dividend.js"
import type { Money } from "../../domain/money.js"
import type { Page, PageOpts } from "../../domain/pagination.js"
import type { Pie, PieDetails, PieSlice } from "../../domain/pie.js"
import type { Position } from "../../domain/position.js"
import type { Transaction, TransactionKind } from "../../domain/transaction.js"
import type { BrokerCapabilities, BrokerConfig, IBroker } from "../base.js"

import { Trading212Client } from "./client.js"
import {
  T212AccountCash,
  T212AccountSummary,
  T212DividendPage,
  T212HistoricalOrderPage,
  T212InstrumentList,
  T212PieDetails,
  T212PieList,
  T212Positions,
  T212TransactionPage,
  type T212DividendItem,
  type T212HistoricalOrderItem,
  type T212InstrumentMetadata,
  type T212PieDetails as T212PieDetailsType,
  type T212PieListEntry,
  type T212PieSlice,
  type T212Position,
  type T212TransactionItem,
} from "./schemas.js"

const BROKER_ID = "t212"
const BROKER_NAME = "Trading 212"
const INSTRUMENT_CACHE_TTL_MS = 6 * 60 * 60 * 1000

const TX_KIND_MAP: Record<string, TransactionKind> = {
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
  WITHDRAW: "withdrawal",
  FEE: "fee",
  INTEREST: "interest",
}

const T212OpenOrders = z.array(z.unknown())

export class Trading212Broker implements IBroker {
  readonly id = BROKER_ID
  readonly name = BROKER_NAME
  readonly capabilities: BrokerCapabilities = {
    pies: true,
    dividends: true,
    transactions: true,
  }

  private client: Trading212Client | null = null
  private baseCurrency: string | null = null
  private readonly instrumentCatalog = new Map<string, T212InstrumentMetadata>()
  private instrumentCatalogLoadedAt: number | null = null

  authenticate(config: BrokerConfig): Promise<void> {
    const apiKey = config.credentials["T212_API_KEY"]
    const apiSecret = config.credentials["T212_API_SECRET"]
    if (apiKey === undefined || apiSecret === undefined) {
      return Promise.reject(
        new Error("T212_API_KEY and T212_API_SECRET are required in credentials"),
      )
    }
    this.client = new Trading212Client({ apiKey, apiSecret })
    return Promise.resolve()
  }

  async getAccount(): Promise<Account> {
    const client = this.requireClient()
    const summary = await client.getJson("/equity/account/summary", T212AccountSummary)
    const fromSummary = mapAccountFromSummary(summary)
    if (fromSummary !== null) {
      this.baseCurrency = fromSummary.currency
      return fromSummary
    }
    // Legacy fallback: older API revisions kept cash outside the summary.
    const cash = await client.getJson("/equity/account/cash", T212AccountCash)
    const ccy = summary.currencyCode ?? summary.currency ?? (await this.resolveBaseCurrency())
    this.baseCurrency = ccy
    return {
      brokerId: BROKER_ID,
      accountId: summary.id !== undefined ? String(summary.id) : "unknown",
      currency: ccy,
      cash: money(cash.free ?? 0, ccy),
      invested: money(cash.invested ?? 0, ccy),
      totalValue: money(cash.total ?? 0, ccy),
      unrealizedPnL: money(cash.ppl ?? cash.result ?? 0, ccy),
    }
  }

  async getPositions(): Promise<readonly Position[]> {
    const client = this.requireClient()
    const positions = await client.getJson("/equity/positions", T212Positions)
    if (this.baseCurrency === null && positions.length > 0) {
      const first = positions[0]
      if (first !== undefined) this.baseCurrency = first.walletImpact.currency
    }
    return positions.map(mapPosition)
  }

  async getTransactions(opts: PageOpts): Promise<Page<Transaction>> {
    const client = this.requireClient()
    const page = await client.getJson(
      buildHistoryPath("/equity/history/transactions", opts),
      T212TransactionPage,
    )
    return mapPage(page, mapTransaction)
  }

  async getDividends(opts: PageOpts): Promise<Page<Dividend>> {
    const client = this.requireClient()
    const page = await client.getJson(
      buildHistoryPath("/equity/history/dividends", opts),
      T212DividendPage,
    )
    const baseCcy = await this.resolveBaseCurrency()
    return mapPage(page, (item) => mapDividend(item, baseCcy))
  }

  async getPies(): Promise<readonly Pie[]> {
    const client = this.requireClient()
    const list = await client.getJson("/equity/pies", T212PieList)
    const baseCcy = await this.resolveBaseCurrency()
    return list.map((entry) => mapPieListEntry(entry, baseCcy))
  }

  async getPie(id: string): Promise<PieDetails> {
    const client = this.requireClient()
    const numericId = Number.parseInt(id, 10)
    if (Number.isNaN(numericId)) {
      throw new Error(`Invalid Trading 212 pie id: ${id}`)
    }
    const details = await client.getJson(`/equity/pies/${String(numericId)}`, T212PieDetails)
    const baseCcy = await this.resolveBaseCurrency()
    await this.ensureInstrumentCatalog().catch(() => {
      // metadata is optional for naming; tolerate cache load failure
    })
    return mapPieDetails(details, baseCcy, (ticker) => this.instrumentCatalog.get(ticker)?.name)
  }

  async searchInstruments(query: string, limit = 10): Promise<readonly T212InstrumentMetadata[]> {
    await this.ensureInstrumentCatalog()
    const needle = query.trim().toLowerCase()
    if (needle.length === 0) return []
    const matches: T212InstrumentMetadata[] = []
    for (const item of this.instrumentCatalog.values()) {
      if (
        item.ticker.toLowerCase().includes(needle) ||
        item.shortName.toLowerCase().includes(needle) ||
        item.name.toLowerCase().includes(needle)
      ) {
        matches.push(item)
        if (matches.length >= limit) break
      }
    }
    return matches
  }

  async getOpenOrders(): Promise<readonly unknown[]> {
    const client = this.requireClient()
    return client.getJson("/equity/orders", T212OpenOrders)
  }

  async getOrderHistory(opts: PageOpts): Promise<Page<T212HistoricalOrderItem>> {
    const client = this.requireClient()
    const page = await client.getJson(
      buildHistoryPath("/equity/history/orders", opts),
      T212HistoricalOrderPage,
    )
    return mapPage(page, (item) => item)
  }

  private requireClient(): Trading212Client {
    if (this.client === null) {
      throw new Error("Trading 212 broker is not authenticated. Call authenticate() first.")
    }
    return this.client
  }

  private async resolveBaseCurrency(): Promise<string> {
    if (this.baseCurrency !== null) return this.baseCurrency
    const client = this.requireClient()
    try {
      const summary = await client.getJson("/equity/account/summary", T212AccountSummary)
      const ccy = summary.currencyCode ?? summary.currency
      if (ccy !== undefined) {
        this.baseCurrency = ccy
        return ccy
      }
    } catch {
      // fall through to positions-based fallback
    }
    try {
      const positions = await client.getJson("/equity/positions", T212Positions)
      const first = positions[0]
      if (first !== undefined) {
        this.baseCurrency = first.walletImpact.currency
        return first.walletImpact.currency
      }
    } catch {
      // ignore
    }
    this.baseCurrency = "USD"
    return "USD"
  }

  private async ensureInstrumentCatalog(): Promise<void> {
    const loadedAt = this.instrumentCatalogLoadedAt
    if (loadedAt !== null && Date.now() - loadedAt < INSTRUMENT_CACHE_TTL_MS) return
    const client = this.requireClient()
    const list = await client.getJson("/equity/metadata/instruments", T212InstrumentList)
    this.instrumentCatalog.clear()
    for (const item of list) this.instrumentCatalog.set(item.ticker, item)
    this.instrumentCatalogLoadedAt = Date.now()
  }
}

export function money(amount: number, currency: string): Money {
  return { amount, currency }
}

// Maps the documented summary shape (nested cash/investments) to a domain
// Account. Returns null when the response carries no nested data (legacy
// revision) or no resolvable currency — the caller then falls back to the
// undocumented-but-still-served /equity/account/cash endpoint.
export function mapAccountFromSummary(summary: T212AccountSummary): Account | null {
  if (summary.cash === undefined && summary.investments === undefined) return null
  const ccy = summary.currency ?? summary.currencyCode
  if (ccy === undefined) return null
  return {
    brokerId: BROKER_ID,
    accountId: summary.id !== undefined ? String(summary.id) : "unknown",
    currency: ccy,
    cash: money(summary.cash?.availableToTrade ?? 0, ccy),
    totalValue: money(summary.totalValue ?? 0, ccy),
    ...(summary.investments?.totalCost !== undefined
      ? { invested: money(summary.investments.totalCost, ccy) }
      : {}),
    ...(summary.investments?.unrealizedProfitLoss !== undefined
      ? { unrealizedPnL: money(summary.investments.unrealizedProfitLoss, ccy) }
      : {}),
    ...(summary.investments?.realizedProfitLoss !== undefined
      ? { realizedPnL: money(summary.investments.realizedProfitLoss, ccy) }
      : {}),
  }
}

export function mapPosition(t212: T212Position): Position {
  const native = t212.instrument.currency
  const account = t212.walletImpact.currency
  return {
    brokerId: BROKER_ID,
    ticker: t212.instrument.ticker,
    instrumentId: t212.instrument.ticker,
    name: t212.instrument.name,
    currency: native,
    quantity: t212.quantity,
    averagePrice: money(t212.averagePricePaid, native),
    currentPrice: money(t212.currentPrice, native),
    marketValue: money(t212.walletImpact.currentValue, account),
    unrealizedPnL: money(t212.walletImpact.unrealizedProfitLoss, account),
  }
}

export function mapTransaction(item: T212TransactionItem): Transaction {
  const kind = TX_KIND_MAP[item.type] ?? "other"
  return {
    brokerId: BROKER_ID,
    id: item.reference,
    kind,
    amount: money(item.amount, item.currency),
    date: item.dateTime,
    description: item.type,
  }
}

export function mapDividend(item: T212DividendItem, fallbackCurrency: string): Dividend {
  const ccy = item.currency ?? fallbackCurrency
  const amount = item.amount ?? 0
  return {
    brokerId: BROKER_ID,
    id: item.reference,
    ticker: item.ticker,
    instrumentId: item.ticker,
    grossAmount: money(amount, ccy),
    netAmount: money(amount, ccy),
    paidDate: item.paidOn ?? item.dateTime ?? "",
  }
}

export function mapPieListEntry(entry: T212PieListEntry, currency: string): Pie {
  return {
    brokerId: BROKER_ID,
    id: String(entry.id),
    name: `Pie ${String(entry.id)}`,
    invested: money(entry.result.priceAvgInvestedValue, currency),
    currentValue: money(entry.result.priceAvgValue, currency),
    unrealizedPnL: money(entry.result.priceAvgResult, currency),
    cashBalance: money(entry.cash, currency),
  }
}

export function mapPieDetails(
  details: T212PieDetailsType,
  currency: string,
  nameLookup: (ticker: string) => string | undefined,
): PieDetails {
  const slices = details.instruments.map((slice) => mapPieSlice(slice, currency, nameLookup))
  const totalInvested = sum(slices.map((s) => s.invested.amount))
  const totalCurrent = sum(slices.map((s) => s.currentValue.amount))
  return {
    brokerId: BROKER_ID,
    id: String(details.settings.id),
    name: details.settings.name,
    invested: money(totalInvested, currency),
    currentValue: money(totalCurrent, currency),
    unrealizedPnL: money(totalCurrent - totalInvested, currency),
    slices,
  }
}

export function mapPieSlice(
  slice: T212PieSlice,
  currency: string,
  nameLookup: (ticker: string) => string | undefined,
): PieSlice {
  const name = nameLookup(slice.ticker)
  return {
    ticker: slice.ticker,
    instrumentId: slice.ticker,
    ...(name !== undefined ? { name } : {}),
    targetWeight: slice.expectedShare,
    currentWeight: slice.currentShare,
    quantity: slice.ownedQuantity,
    invested: money(slice.result.priceAvgInvestedValue, currency),
    currentValue: money(slice.result.priceAvgValue, currency),
    unrealizedPnL: money(slice.result.priceAvgResult, currency),
  }
}

function mapPage<S, T>(
  page: { readonly items: readonly S[]; readonly nextPagePath: string | null },
  mapItem: (item: S) => T,
): Page<T> {
  const cursor = extractCursor(page.nextPagePath)
  return {
    items: page.items.map(mapItem),
    hasMore: page.nextPagePath !== null,
    ...(cursor !== undefined ? { nextCursor: cursor } : {}),
  }
}

export function extractCursor(nextPagePath: string | null): string | undefined {
  if (nextPagePath === null) return undefined
  try {
    const url = new URL(nextPagePath, "https://placeholder.invalid")
    return url.searchParams.get("cursor") ?? undefined
  } catch {
    return undefined
  }
}

export function buildHistoryPath(base: string, opts: PageOpts): string {
  const params = new URLSearchParams()
  if (opts.limit !== undefined) params.set("limit", String(opts.limit))
  if (opts.cursor !== undefined) params.set("cursor", opts.cursor)
  const query = params.toString()
  return query.length > 0 ? `${base}?${query}` : base
}

function sum(values: readonly number[]): number {
  let total = 0
  for (const v of values) total += v
  return total
}
