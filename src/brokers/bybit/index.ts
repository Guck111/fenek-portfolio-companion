import type { Account } from "../../domain/account.js"
import type { DerivativePosition } from "../../domain/derivative.js"
import type { Dividend } from "../../domain/dividend.js"
import type { EarnPosition } from "../../domain/earn.js"
import type { OpenOrder } from "../../domain/order.js"
import type { Page } from "../../domain/pagination.js"
import type { Position } from "../../domain/position.js"
import type { Transaction } from "../../domain/transaction.js"
import { AuthError } from "../../utils/errors.js"
import type { BrokerCapabilities, BrokerConfig, IBroker } from "../base.js"

import { BybitClient } from "./client.js"
import {
  BybitAccountInfo,
  BybitApiKeyInfo,
  BybitDualAssetPositionResult,
  BybitEarnPositionResult,
  BybitFixedTermPositionResult,
  BybitOrderListResult,
  BybitPositionListResult,
  BybitTokenPositionResult,
  BybitWalletBalanceResult,
} from "./schemas.js"

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
const POSITION_PATH = "/v5/position/list"
// linear requires symbol or settleCoin, so it is queried once per settle coin;
// inverse and option accept a bare category query.
const POSITION_QUERIES: readonly { category: string; query: Record<string, string> }[] = [
  { category: "linear", query: { category: "linear", settleCoin: "USDT", limit: "200" } },
  { category: "linear", query: { category: "linear", settleCoin: "USDC", limit: "200" } },
  { category: "inverse", query: { category: "inverse", limit: "200" } },
  { category: "option", query: { category: "option", limit: "200" } },
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

const MS_PER_DAY = 24 * 60 * 60 * 1000
const EXPIRY_WARNING_DAYS = 14

// "5.50%" → 5.5 (percent).
function apyFromPercent(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  return num(value.endsWith("%") ? value.slice(0, -1) : value)
}

// Bybit *E8 rate fields are fractions scaled by 1e8: 5_000_000 → 0.05 → 5%.
function apyFromE8(value: string | number | undefined): number | undefined {
  const raw = typeof value === "number" ? value : num(value)
  if (raw === undefined) return undefined
  return (raw / 1e8) * 100
}

export function mapEarnPositions(
  result: BybitEarnPositionResult,
  family: "flexible" | "onchain",
): EarnPosition[] {
  const positions: EarnPosition[] = []
  for (const p of result.list) {
    const amount = num(p.amount) ?? 0
    // FlexibleSaving also returns fully-redeemed positions — skip empty ones.
    if (amount <= 0) continue
    positions.push({
      brokerId: BROKER_ID,
      family,
      coin: p.coin,
      amount,
      ...(p.productId !== undefined ? { productId: p.productId } : {}),
      ...maybe("claimableYield", num(p.claimableYield)),
      ...maybe("totalPnl", num(p.totalPnl)),
      ...(p.status !== undefined ? { status: p.status } : {}),
      ...(p.settlementTime !== undefined ? { settlementTime: p.settlementTime } : {}),
    })
  }
  return positions
}

export function mapFixedTermPositions(result: BybitFixedTermPositionResult): EarnPosition[] {
  const positions: EarnPosition[] = []
  for (const p of result.list) {
    const amount = num(p.amount) ?? 0
    if (amount <= 0) continue
    const apyEntry = p.interestCoinApyList?.[0]
    positions.push({
      brokerId: BROKER_ID,
      family: "fixed-term",
      coin: p.coin,
      amount,
      ...(p.productId !== undefined ? { productId: p.productId } : {}),
      ...maybe("apy", apyFromPercent(apyEntry?.apy)),
      ...maybe("expectedReturn", num(apyEntry?.expectReturnEarning)),
      ...(p.status !== undefined ? { status: p.status } : {}),
      ...(p.settlementTime !== undefined ? { settlementTime: p.settlementTime } : {}),
    })
  }
  return positions
}

// The BYUSDT yield token reports one flat aggregate, not a list.
export function mapTokenPosition(result: BybitTokenPositionResult): EarnPosition[] {
  const amount = num(result.totalAmount) ?? 0
  if (amount <= 0) return []
  return [
    {
      brokerId: BROKER_ID,
      family: "token",
      coin: "BYUSDT",
      amount,
      ...maybe("totalPnl", num(result.totalYield)),
      ...maybe("apy", apyFromE8(result.aprE8)),
    },
  ]
}

export function mapDualAssetPositions(result: BybitDualAssetPositionResult): EarnPosition[] {
  const positions: EarnPosition[] = []
  for (const p of result.list) {
    const amount = num(p.amount) ?? 0
    if (amount <= 0) continue
    positions.push({
      brokerId: BROKER_ID,
      family: "dual-asset",
      coin: p.investCoin,
      amount,
      ...(p.productId !== undefined ? { productId: p.productId } : {}),
      ...maybe("apy", apyFromE8(p.apyE8)),
      ...maybe("expectedReturn", num(p.expectReturnAmount)),
      ...(p.status !== undefined ? { status: p.status } : {}),
      ...(p.settlementTime !== undefined ? { settlementTime: String(p.settlementTime) } : {}),
    })
  }
  return positions
}

export interface EarnFamilyOutcome {
  readonly family: string
  readonly positions?: readonly EarnPosition[]
  readonly error?: unknown
}

export interface BybitEarnReport {
  readonly positions: readonly EarnPosition[]
  readonly failures: readonly { readonly family: string; readonly message: string }[]
}

// Folds per-family outcomes into one report. When every family failed and at
// least one failure is an auth rejection, the whole key lacks the Earn
// permission — surface that as a single actionable error instead of noise.
export function buildEarnReport(outcomes: readonly EarnFamilyOutcome[]): BybitEarnReport {
  const positions: EarnPosition[] = []
  const failures: { family: string; message: string }[] = []
  let sawAuthError = false
  for (const o of outcomes) {
    if (o.error !== undefined) {
      if (o.error instanceof AuthError) sawAuthError = true
      failures.push({
        family: o.family,
        message: o.error instanceof Error ? o.error.message : String(o.error),
      })
      continue
    }
    positions.push(...(o.positions ?? []))
  }
  if (failures.length === outcomes.length && outcomes.length > 0 && sawAuthError) {
    throw new AuthError(
      "Bybit API key lacks the Earn read permission — enable Earn in the key settings to read staked positions.",
      BROKER_ID,
    )
  }
  return { positions, failures }
}

export interface BybitKeyInfoReport {
  readonly readOnly?: boolean
  readonly permissions?: Readonly<Record<string, readonly string[]>>
  readonly ips?: readonly string[]
  readonly expiresAt?: string
  readonly daysToExpiry?: number
  readonly isMaster?: boolean
  readonly note?: string
  readonly marginMode?: string
  readonly unifiedMarginStatus?: number
  readonly warnings: readonly string[]
}

// Key self-diagnostics: what the configured key may read, whether it is
// actually read-only, and when it expires. `nowMs` is injected for testability.
export function mapKeyInfo(
  key: BybitApiKeyInfo,
  accountInfo: BybitAccountInfo | null,
  nowMs: number,
): BybitKeyInfoReport {
  const warnings: string[] = []
  const readOnly = key.readOnly === undefined ? undefined : key.readOnly === 1
  if (readOnly === false) {
    warnings.push(
      "This API key is NOT read-only — re-create it in Bybit with read-only permissions (no Trade, no Withdraw).",
    )
  }
  let daysToExpiry: number | undefined
  if (key.expiredAt !== undefined) {
    const expiresMs = Date.parse(key.expiredAt)
    if (Number.isFinite(expiresMs)) {
      daysToExpiry = Math.ceil((expiresMs - nowMs) / MS_PER_DAY)
      if (daysToExpiry <= EXPIRY_WARNING_DAYS) {
        warnings.push(
          `This API key expires in ${String(daysToExpiry)} day(s) — re-create or extend it in Bybit to avoid losing access.`,
        )
      }
    }
  }
  return {
    ...(readOnly !== undefined ? { readOnly } : {}),
    ...(key.permissions !== undefined ? { permissions: key.permissions } : {}),
    ...(key.ips !== undefined ? { ips: key.ips } : {}),
    ...(key.expiredAt !== undefined ? { expiresAt: key.expiredAt } : {}),
    ...(daysToExpiry !== undefined ? { daysToExpiry } : {}),
    ...(key.isMaster !== undefined ? { isMaster: key.isMaster } : {}),
    ...(key.note !== undefined ? { note: key.note } : {}),
    ...(accountInfo?.marginMode !== undefined ? { marginMode: accountInfo.marginMode } : {}),
    ...(accountInfo?.unifiedMarginStatus !== undefined
      ? { unifiedMarginStatus: accountInfo.unifiedMarginStatus }
      : {}),
    warnings,
  }
}

// Raw Bybit positions → normalized DerivativePosition. Zero-size rows (the
// exchange reports them for one-way-mode symbols with no position) are dropped.
export function mapDerivativePositions(
  result: BybitPositionListResult,
  category: string,
): DerivativePosition[] {
  if (result.nextPageCursor !== undefined && result.nextPageCursor !== "") {
    console.error(
      `[bybit] derivative positions for category=${category} exceeded one page; showing first 200 only`,
    )
  }
  const positions: DerivativePosition[] = []
  for (const p of result.list) {
    const size = num(p.size) ?? 0
    if (size === 0) continue
    const side = p.side.toLowerCase()
    positions.push({
      brokerId: BROKER_ID,
      symbol: p.symbol,
      category,
      side: side === "buy" ? "long" : side === "sell" ? "short" : "none",
      size,
      ...maybe("entryPrice", num(p.avgPrice)),
      ...maybe("markPrice", num(p.markPrice)),
      ...maybe("positionValue", num(p.positionValue)),
      ...maybe("unrealizedPnL", num(p.unrealisedPnl)),
      ...maybe("realizedPnLCurrent", num(p.curRealisedPnl)),
      ...maybe("realizedPnLCumulative", num(p.cumRealisedPnl)),
      ...maybe("leverage", num(p.leverage)),
      ...maybe("liquidationPrice", num(p.liqPrice)),
      ...maybe("takeProfit", num(p.takeProfit)),
      ...maybe("stopLoss", num(p.stopLoss)),
      ...(p.updatedTime !== undefined ? { updatedAt: p.updatedTime } : {}),
    })
  }
  return positions
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

  // Open derivatives positions across all categories. Each category query is
  // independent — one failing (e.g. a key without option access) must not hide
  // the others, so failures are collected and surfaced alongside the data.
  async getDerivativePositions(): Promise<{
    readonly positions: readonly DerivativePosition[]
    readonly failures: readonly { readonly category: string; readonly message: string }[]
  }> {
    const client = this.requireClient()
    const settled = await Promise.allSettled(
      POSITION_QUERIES.map((q) =>
        client
          .getJson(POSITION_PATH, q.query, BybitPositionListResult)
          .then((r) => mapDerivativePositions(r, q.category)),
      ),
    )
    const positions: DerivativePosition[] = []
    const failures: { category: string; message: string }[] = []
    settled.forEach((s, i) => {
      const query = POSITION_QUERIES[i]
      if (s.status === "fulfilled") {
        positions.push(...s.value)
        return
      }
      const settleCoin = query?.query["settleCoin"]
      const label =
        query === undefined
          ? "unknown"
          : settleCoin !== undefined
            ? `${query.category}:${settleCoin}`
            : query.category
      failures.push({
        category: label,
        message: s.reason instanceof Error ? s.reason.message : String(s.reason),
      })
    })
    return { positions, failures }
  }

  // Staked/saving balances across Earn families. These funds never appear in
  // wallet-balance, so without this call they are invisible. Families fail
  // independently; buildEarnReport folds outcomes and raises a single
  // permission error when the key has no Earn access at all.
  async getEarnPositions(): Promise<BybitEarnReport> {
    const client = this.requireClient()
    const families: readonly { family: string; run: () => Promise<EarnPosition[]> }[] = [
      {
        family: "flexible",
        run: () =>
          client
            .getJson("/v5/earn/position", { category: "FlexibleSaving" }, BybitEarnPositionResult)
            .then((r) => mapEarnPositions(r, "flexible")),
      },
      {
        family: "onchain",
        run: () =>
          client
            .getJson("/v5/earn/position", { category: "OnChain" }, BybitEarnPositionResult)
            .then((r) => mapEarnPositions(r, "onchain")),
      },
      {
        family: "fixed-term",
        run: () =>
          client
            .getJson("/v5/earn/fixed-term/position", {}, BybitFixedTermPositionResult)
            .then(mapFixedTermPositions),
      },
      {
        family: "token",
        run: () =>
          client
            .getJson("/v5/earn/token/position", { coin: "BYUSDT" }, BybitTokenPositionResult)
            .then(mapTokenPosition),
      },
      {
        family: "dual-asset",
        run: () =>
          client
            .getJson(
              "/v5/earn/advance/position",
              { category: "DualAssets", limit: "20" },
              BybitDualAssetPositionResult,
            )
            .then(mapDualAssetPositions),
      },
    ]
    const settled = await Promise.allSettled(families.map((f) => f.run()))
    return buildEarnReport(
      settled.map((s, i) => {
        const family = families[i]?.family ?? "unknown"
        return s.status === "fulfilled"
          ? { family, positions: s.value }
          : { family, error: s.reason as unknown }
      }),
    )
  }

  // Key diagnostics. /v5/user/query-api answers for any permission set;
  // /v5/account/info may fail on restricted keys and is therefore optional.
  async getKeyInfo(): Promise<BybitKeyInfoReport> {
    const client = this.requireClient()
    const key = await client.getJson("/v5/user/query-api", {}, BybitApiKeyInfo)
    let accountInfo: BybitAccountInfo | null = null
    try {
      accountInfo = await client.getJson("/v5/account/info", {}, BybitAccountInfo)
    } catch {
      // tolerated: the key report is still useful without margin status
    }
    return mapKeyInfo(key, accountInfo, Date.now())
  }

  getTransactions(): Promise<Page<Transaction>> {
    return Promise.resolve({ items: [], hasMore: false })
  }

  getDividends(): Promise<Page<Dividend>> {
    return Promise.resolve({ items: [], hasMore: false })
  }
}
