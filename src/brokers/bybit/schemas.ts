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
// All numeric fields arrive as strings; usdValue may be "" for coins with no USD market.
export const BybitWalletCoin = z.object({
  coin: z.string(),
  walletBalance: z.string(),
  usdValue: z.string().optional(),
})
export const BybitWalletAccount = z.object({
  accountType: z.string(),
  coin: z.array(BybitWalletCoin),
})
export const BybitWalletBalanceResult = z.object({
  list: z.array(BybitWalletAccount),
})
export type BybitWalletCoin = z.infer<typeof BybitWalletCoin>
export type BybitWalletAccount = z.infer<typeof BybitWalletAccount>
export type BybitWalletBalanceResult = z.infer<typeof BybitWalletBalanceResult>

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
