import type { Account } from "../../domain/account.js"
import type { Dividend } from "../../domain/dividend.js"
import type { OpenOrder } from "../../domain/order.js"
import type { Page } from "../../domain/pagination.js"
import type { Position } from "../../domain/position.js"
import type { Transaction } from "../../domain/transaction.js"
import { AuthError } from "../../utils/errors.js"
import type { BrokerCapabilities, BrokerConfig, IBroker } from "../base.js"

import { BybitClient } from "./client.js"
import { BybitOrderListResult, BybitWalletBalanceResult } from "./schemas.js"

const BROKER_ID = "bybit"
const BROKER_NAME = "Bybit"
const USD = "USD"
const WALLET_PATH = "/v5/account/wallet-balance"
const ACCOUNT_TYPE = "UNIFIED"
const ORDER_PATH = "/v5/order/realtime"
const ORDER_QUERIES: readonly { category: string; query: Record<string, string> }[] = [
  { category: "spot", query: { category: "spot", limit: "50" } },
  { category: "linear", query: { category: "linear", settleCoin: "USDT", limit: "50" } },
  { category: "linear", query: { category: "linear", settleCoin: "USDC", limit: "50" } },
]

// Bybit reports numbers as strings and uses "" for "no value". Parse to a
// number only when the string is non-empty and finite.
export function num(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export interface BybitCoinDetail {
  readonly coin: string
  readonly quantity: number
  readonly usdValue?: number
  readonly equity?: number
  readonly unrealisedPnl?: number
  readonly cumRealisedPnl?: number
  readonly borrowAmount?: number
  readonly accruedInterest?: number
  readonly locked?: number
}

export interface BybitAccountDetail {
  readonly totalEquity?: number
  readonly totalWalletBalance?: number
  readonly totalMarginBalance?: number
  readonly totalAvailableBalance?: number
  readonly totalPerpUPL?: number
  readonly accountIMRate?: number
  readonly accountMMRate?: number
  readonly coins: readonly BybitCoinDetail[]
}

function maybe<K extends string>(key: K, value: number | undefined): Partial<Record<K, number>> {
  return value !== undefined ? ({ [key]: value } as Record<K, number>) : {}
}

// Account-level totals (USD) plus per-coin detail from the same wallet-balance
// payload that feeds mapWalletBalance. Margin rates are liquidation-risk
// indicators: accountMMRate approaching 1 means liquidation territory.
export function mapAccountDetail(result: BybitWalletBalanceResult): BybitAccountDetail | null {
  const account = result.list.find((a) => a.accountType === ACCOUNT_TYPE) ?? result.list[0]
  if (account === undefined) return null
  return {
    ...maybe("totalEquity", num(account.totalEquity)),
    ...maybe("totalWalletBalance", num(account.totalWalletBalance)),
    ...maybe("totalMarginBalance", num(account.totalMarginBalance)),
    ...maybe("totalAvailableBalance", num(account.totalAvailableBalance)),
    ...maybe("totalPerpUPL", num(account.totalPerpUPL)),
    ...maybe("accountIMRate", num(account.accountIMRate)),
    ...maybe("accountMMRate", num(account.accountMMRate)),
    coins: account.coin.map((c) => ({
      coin: c.coin,
      quantity: num(c.walletBalance) ?? 0,
      ...maybe("usdValue", num(c.usdValue)),
      ...maybe("equity", num(c.equity)),
      ...maybe("unrealisedPnl", num(c.unrealisedPnl)),
      ...maybe("cumRealisedPnl", num(c.cumRealisedPnl)),
      ...maybe("borrowAmount", num(c.borrowAmount)),
      ...maybe("accruedInterest", num(c.accruedInterest)),
      ...maybe("locked", num(c.locked)),
    })),
  }
}

// Coins arrive with string amounts; usdValue may be "" when Bybit has no USD market.
// Keep only coins with a positive balance AND a positive USD valuation; count the rest.
export function mapWalletBalance(result: BybitWalletBalanceResult): {
  positions: Position[]
  dropped: number
} {
  const positions: Position[] = []
  let dropped = 0
  const account = result.list.find((a) => a.accountType === ACCOUNT_TYPE) ?? result.list[0]
  if (account === undefined) return { positions, dropped }

  for (const c of account.coin) {
    const quantity = Number(c.walletBalance)
    const usd = c.usdValue === undefined || c.usdValue === "" ? Number.NaN : Number(c.usdValue)
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(usd) || usd <= 0) {
      dropped++
      continue
    }
    positions.push({
      brokerId: BROKER_ID,
      ticker: c.coin,
      currency: USD,
      quantity,
      currentPrice: { amount: usd / quantity, currency: USD },
      marketValue: { amount: usd, currency: USD },
    })
  }
  return { positions, dropped }
}

export function assembleAccount(
  positions: readonly Position[],
  detail?: BybitAccountDetail,
): Account {
  const total = positions.reduce((sum, p) => sum + p.marketValue.amount, 0)
  return {
    brokerId: BROKER_ID,
    accountId: "unified",
    currency: USD,
    cash: { amount: 0, currency: USD },
    // totalEquity includes derivatives UPL and option value — closer to the
    // truth than the spot-coin sum whenever the exchange reports it.
    totalValue: { amount: detail?.totalEquity ?? total, currency: USD },
    ...(detail?.totalPerpUPL !== undefined
      ? { unrealizedPnL: { amount: detail.totalPerpUPL, currency: USD } }
      : {}),
  }
}

// Raw Bybit orders → normalized OpenOrder. Numbers arrive as strings; side is
// "Buy"/"Sell". No filtering — all open orders are shown.
export function mapOpenOrders(result: BybitOrderListResult, category: string): OpenOrder[] {
  if (result.nextPageCursor !== undefined && result.nextPageCursor !== "") {
    console.error(
      `[bybit] open orders for category=${category} exceeded one page; showing first 50 only`,
    )
  }
  return result.list.map((o) => {
    const base = {
      brokerId: BROKER_ID,
      orderId: o.orderId,
      symbol: o.symbol,
      side: o.side.toLowerCase() === "sell" ? ("sell" as const) : ("buy" as const),
      orderType: o.orderType,
      price: Number(o.price),
      quantity: Number(o.qty),
      filledQuantity: o.cumExecQty === undefined ? 0 : Number(o.cumExecQty),
      status: o.orderStatus,
      category,
    }
    return o.createdTime !== undefined ? { ...base, createdAt: o.createdTime } : base
  })
}

export class BybitBroker implements IBroker {
  readonly id = BROKER_ID
  readonly name = BROKER_NAME
  readonly capabilities: BrokerCapabilities = {
    pies: false,
    dividends: false,
    transactions: false,
  }

  private client: BybitClient | undefined

  authenticate(config: BrokerConfig): Promise<void> {
    const apiKey = config.credentials["BYBIT_API_KEY"]
    const apiSecret = config.credentials["BYBIT_API_SECRET"]
    if (apiKey === undefined || apiSecret === undefined) {
      throw new AuthError("Bybit API key and secret are required", BROKER_ID)
    }
    this.client = new BybitClient({ apiKey, apiSecret })
    return Promise.resolve()
  }

  private requireClient(): BybitClient {
    if (this.client === undefined) {
      throw new AuthError("Bybit broker is not authenticated", BROKER_ID)
    }
    return this.client
  }

  private fetchWallet(): Promise<BybitWalletBalanceResult> {
    return this.requireClient().getJson(
      WALLET_PATH,
      { accountType: ACCOUNT_TYPE },
      BybitWalletBalanceResult,
    )
  }

  async getPositions(): Promise<readonly Position[]> {
    const result = await this.fetchWallet()
    // dropped is exercised by the mapper test; like crypto_get_positions, the IBroker
    // contract returns Position[] only, so the dropped count is not surfaced to the tool.
    return mapWalletBalance(result).positions
  }

  async getAccount(): Promise<Account> {
    const result = await this.fetchWallet()
    const { positions } = mapWalletBalance(result)
    return assembleAccount(positions, mapAccountDetail(result) ?? undefined)
  }

  // One wallet-balance fetch powering the bybit_get_account tool: the
  // normalized Account plus everything the exchange reports about margin
  // health and per-coin balances.
  async getAccountReport(): Promise<{ readonly account: Account } & Partial<BybitAccountDetail>> {
    const result = await this.fetchWallet()
    const { positions } = mapWalletBalance(result)
    const detail = mapAccountDetail(result)
    return {
      account: assembleAccount(positions, detail ?? undefined),
      ...(detail ?? {}),
    }
  }

  async getOpenOrders(): Promise<readonly OpenOrder[]> {
    const client = this.requireClient()
    const perCategory = await Promise.all(
      ORDER_QUERIES.map((q) =>
        client
          .getJson(ORDER_PATH, q.query, BybitOrderListResult)
          .then((r) => mapOpenOrders(r, q.category)),
      ),
    )
    return perCategory.flat()
  }

  getTransactions(): Promise<Page<Transaction>> {
    return Promise.resolve({ items: [], hasMore: false })
  }

  getDividends(): Promise<Page<Dividend>> {
    return Promise.resolve({ items: [], hasMore: false })
  }
}
