import { z } from "zod"

// Bybit V5 wraps every response. retCode 0 = success; a non-zero code is an error
// even when HTTP status is 200. `result` shape varies per endpoint, so keep it unknown
// here and parse it with an endpoint-specific schema after checking retCode.
export const BybitEnvelope = z.object({
  retCode: z.number(),
  retMsg: z.string(),
  result: z.unknown(),
  time: z.number().optional(),
})
export type BybitEnvelope = z.infer<typeof BybitEnvelope>

// GET /v5/account/wallet-balance?accountType=UNIFIED → result.
// All numeric fields arrive as strings; any of them may be "" when Bybit has
// no value (e.g. usdValue for coins with no USD market, or margin fields
// under portfolio margin mode).
export const BybitWalletCoin = z.object({
  coin: z.string(),
  walletBalance: z.string(),
  usdValue: z.string().optional(),
  equity: z.string().optional(),
  unrealisedPnl: z.string().optional(),
  cumRealisedPnl: z.string().optional(),
  borrowAmount: z.string().optional(),
  accruedInterest: z.string().optional(),
  locked: z.string().optional(),
})
export const BybitWalletAccount = z.object({
  accountType: z.string(),
  coin: z.array(BybitWalletCoin),
  totalEquity: z.string().optional(),
  totalWalletBalance: z.string().optional(),
  totalMarginBalance: z.string().optional(),
  totalAvailableBalance: z.string().optional(),
  totalPerpUPL: z.string().optional(),
  accountIMRate: z.string().optional(),
  accountMMRate: z.string().optional(),
})
export const BybitWalletBalanceResult = z.object({
  list: z.array(BybitWalletAccount),
})
export type BybitWalletCoin = z.infer<typeof BybitWalletCoin>
export type BybitWalletAccount = z.infer<typeof BybitWalletAccount>
export type BybitWalletBalanceResult = z.infer<typeof BybitWalletBalanceResult>

// GET /v5/position/list → result. All numeric fields arrive as strings; ""
// means "not set" (e.g. stopLoss) or "not applicable" (leverage/liqPrice under
// portfolio margin). Only the fields we map are declared; unknown are stripped.
export const BybitPosition = z.object({
  symbol: z.string(),
  side: z.string(), // "Buy" / "Sell" / "None"
  size: z.string(),
  avgPrice: z.string().optional(),
  markPrice: z.string().optional(),
  positionValue: z.string().optional(),
  unrealisedPnl: z.string().optional(),
  curRealisedPnl: z.string().optional(),
  cumRealisedPnl: z.string().optional(),
  leverage: z.string().optional(),
  liqPrice: z.string().optional(),
  takeProfit: z.string().optional(),
  stopLoss: z.string().optional(),
  positionIdx: z.number().optional(),
  updatedTime: z.string().optional(),
})
export const BybitPositionListResult = z.object({
  list: z.array(BybitPosition),
  nextPageCursor: z.string().optional(),
})
export type BybitPosition = z.infer<typeof BybitPosition>
export type BybitPositionListResult = z.infer<typeof BybitPositionListResult>

// Earn position endpoints (docs/v5/finance/earn/*). All require the "Earn"
// key permission. Numbers arrive as strings; "" means "no value".
// GET /v5/earn/position?category=FlexibleSaving|OnChain → result.list[].
export const BybitEarnPositionItem = z.object({
  coin: z.string(),
  productId: z.string().optional(),
  amount: z.string().optional(),
  totalPnl: z.string().optional(),
  claimableYield: z.string().optional(),
  status: z.string().optional(),
  autoReinvest: z.string().optional(),
  availableAmount: z.string().optional(),
  settlementTime: z.string().optional(),
})
export const BybitEarnPositionResult = z.object({
  list: z.array(BybitEarnPositionItem),
})
export type BybitEarnPositionResult = z.infer<typeof BybitEarnPositionResult>

// GET /v5/earn/fixed-term/position → result.list[]. APY arrives as "5.50%".
export const BybitFixedTermApyEntry = z.object({
  coin: z.string().optional(),
  apy: z.string().optional(),
  expectReturnEarning: z.string().optional(),
})
export const BybitFixedTermPositionItem = z.object({
  positionId: z.string().optional(),
  productId: z.string().optional(),
  category: z.string().optional(),
  coin: z.string(),
  amount: z.string().optional(),
  status: z.string().optional(),
  settlementTime: z.string().optional(),
  interestCoinApyList: z.array(BybitFixedTermApyEntry).nullable().optional(),
})
export const BybitFixedTermPositionResult = z.object({
  list: z.array(BybitFixedTermPositionItem),
})
export type BybitFixedTermPositionResult = z.infer<typeof BybitFixedTermPositionResult>

// GET /v5/earn/token/position?coin=BYUSDT → flat result (no list).
// aprE8/bonusAprE8 are integers scaled by 1e8 — Bybit serializes them as
// strings, so accept either (apyFromE8 coerces). Same shape as apyE8 below.
export const BybitTokenPositionResult = z.object({
  totalAmount: z.string().optional(),
  totalYield: z.string().optional(),
  yesterdayYield: z.string().optional(),
  aprE8: z.union([z.string(), z.number()]).optional(),
  bonusAprE8: z.union([z.string(), z.number()]).optional(),
})
export type BybitTokenPositionResult = z.infer<typeof BybitTokenPositionResult>

// GET /v5/earn/advance/position?category=DualAssets → result.list[].
export const BybitDualAssetPositionItem = z.object({
  positionId: z.string().optional(),
  productId: z.string().optional(),
  investCoin: z.string(),
  amount: z.string().optional(),
  apyE8: z.union([z.string(), z.number()]).optional(),
  direction: z.string().optional(),
  targetPrice: z.string().optional(),
  settlementTime: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional(),
  expectReturnCoin: z.string().optional(),
  expectReturnAmount: z.string().optional(),
})
export const BybitDualAssetPositionResult = z.object({
  list: z.array(BybitDualAssetPositionItem),
  nextPageCursor: z.string().optional(),
})
export type BybitDualAssetPositionResult = z.infer<typeof BybitDualAssetPositionResult>

// GET /v5/asset/asset-overview → result. Account/category/total `equity` totals
// are fiat (the valuation currency, default USD), but coinDetail[].equity is the
// per-coin AMOUNT (holdings), NOT a USD value — a zero-price/delisted token shows
// its full coin count here while being worth ~$0. The mapper re-labels it
// `quantity` (see mapOverviewCoins) so it is never read as money. Accounts with
// product sub-categories (e.g. Earn) report `categories`; flat ones report `coinDetail`.
export const BybitOverviewCoinDetail = z.object({
  coin: z.string(),
  equity: z.string().optional(),
})
export const BybitOverviewCategory = z.object({
  category: z.string(),
  equity: z.string().optional(),
  coinDetail: z.array(BybitOverviewCoinDetail).nullable().optional(),
})
export const BybitOverviewAccount = z.object({
  accountType: z.string(),
  totalEquity: z.string().optional(),
  valuationCurrency: z.string().optional(),
  coinDetail: z.array(BybitOverviewCoinDetail).nullable().optional(),
  categories: z.array(BybitOverviewCategory).nullable().optional(),
})
export const BybitAssetOverviewResult = z.object({
  totalEquity: z.string().optional(),
  list: z.array(BybitOverviewAccount).optional(),
})
export type BybitAssetOverviewResult = z.infer<typeof BybitAssetOverviewResult>

// GET /v5/asset/transfer/query-account-coins-balance?accountType=FUND →
// result. For FUND the coin param may be omitted (all coins returned).
export const BybitCoinsBalanceEntry = z.object({
  coin: z.string(),
  walletBalance: z.string().optional(),
  transferBalance: z.string().optional(),
  bonus: z.string().optional(),
})
export const BybitCoinsBalanceResult = z.object({
  accountType: z.string().optional(),
  balance: z.array(BybitCoinsBalanceEntry),
})
export type BybitCoinsBalanceResult = z.infer<typeof BybitCoinsBalanceResult>

// GET /v5/user/query-api → result. Works with any permission set — used for
// key self-diagnostics. Lenient: Bybit adds fields here often.
export const BybitApiKeyInfo = z.object({
  readOnly: z.number().optional(),
  permissions: z.record(z.string(), z.array(z.string())).optional(),
  ips: z.array(z.string()).optional(),
  expiredAt: z.string().optional(),
  deadlineDay: z.number().optional(),
  isMaster: z.boolean().optional(),
  note: z.string().optional(),
})
export type BybitApiKeyInfo = z.infer<typeof BybitApiKeyInfo>

// GET /v5/account/info → result. unifiedMarginStatus: 1 classic, 3/4 UTA 1.0,
// 5/6 UTA 2.0.
export const BybitAccountInfo = z.object({
  unifiedMarginStatus: z.number().optional(),
  marginMode: z.string().optional(),
})
export type BybitAccountInfo = z.infer<typeof BybitAccountInfo>

// GET /v5/order/realtime → result. All numeric fields arrive as strings.
// Only the fields we map are declared; unknown fields are stripped (non-strict).
export const BybitOrder = z.object({
  orderId: z.string(),
  symbol: z.string(),
  side: z.string(), // "Buy" / "Sell"
  orderType: z.string(), // "Limit" / "Market" / ...
  price: z.string(),
  qty: z.string(),
  cumExecQty: z.string().optional(),
  orderStatus: z.string(),
  createdTime: z.string().optional(),
})
export const BybitOrderListResult = z.object({
  list: z.array(BybitOrder),
  nextPageCursor: z.string().optional(),
})
export type BybitOrder = z.infer<typeof BybitOrder>
export type BybitOrderListResult = z.infer<typeof BybitOrderListResult>
