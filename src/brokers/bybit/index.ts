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

export function assembleAccount(positions: readonly Position[]): Account {
  const total = positions.reduce((sum, p) => sum + p.marketValue.amount, 0)
  return {
    brokerId: BROKER_ID,
    accountId: "unified",
    currency: USD,
    cash: { amount: 0, currency: USD },
    totalValue: { amount: total, currency: USD },
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

  async getPositions(): Promise<readonly Position[]> {
    const result = await this.requireClient().getJson(
      WALLET_PATH,
      { accountType: ACCOUNT_TYPE },
      BybitWalletBalanceResult,
    )
    // dropped is exercised by the mapper test; like crypto_get_positions, the IBroker
    // contract returns Position[] only, so the dropped count is not surfaced to the tool.
    return mapWalletBalance(result).positions
  }

  async getAccount(): Promise<Account> {
    const positions = await this.getPositions()
    return assembleAccount(positions)
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
