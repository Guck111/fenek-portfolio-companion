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
