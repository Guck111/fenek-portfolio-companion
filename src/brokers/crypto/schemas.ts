import { z } from "zod"

// --- Helius getAssetsByOwner (DAS) ---
export const HeliusTokenInfo = z.object({
  balance: z.number().optional(),
  decimals: z.number().optional(),
  symbol: z.string().optional(),
})
export const HeliusAsset = z.object({
  id: z.string(),
  interface: z.string().optional(),
  token_info: HeliusTokenInfo.optional(),
})
export const HeliusNativeBalance = z.object({
  lamports: z.number().optional(),
})
export const HeliusAssetsResult = z.object({
  items: z.array(HeliusAsset),
  nativeBalance: HeliusNativeBalance.optional(),
})
export const HeliusRpcResponse = z.object({
  result: HeliusAssetsResult,
})
export type HeliusAsset = z.infer<typeof HeliusAsset>
export type HeliusAssetsResult = z.infer<typeof HeliusAssetsResult>

// --- tonapi ---
export const TonAccount = z.object({
  balance: z.number(), // nanoton
})
export type TonAccount = z.infer<typeof TonAccount>

export const TonJettonMeta = z.object({
  address: z.string(),
  symbol: z.string().optional(),
  name: z.string().optional(),
  decimals: z.union([z.number(), z.string()]).optional(),
})
export const TonJettonBalance = z.object({
  balance: z.string(), // raw integer string
  jetton: TonJettonMeta,
})
export const TonJettonsResponse = z.object({
  balances: z.array(TonJettonBalance),
})
export type TonJettonBalance = z.infer<typeof TonJettonBalance>
export type TonJettonsResponse = z.infer<typeof TonJettonsResponse>

// --- DefiLlama prices ---
export const DefiLlamaPrice = z.object({
  price: z.number(),
  symbol: z.string().optional(),
  decimals: z.number().optional(),
  timestamp: z.number().optional(),
})
export const DefiLlamaPricesResponse = z.object({
  coins: z.record(z.string(), DefiLlamaPrice),
})
export type DefiLlamaPricesResponse = z.infer<typeof DefiLlamaPricesResponse>

// --- Jupiter Trigger API (getTriggerOrders) ---
// makingAmount/takingAmount are human-readable (UI) amounts; raw* hold base units.
export const JupiterTriggerOrder = z.object({
  orderKey: z.string(),
  inputMint: z.string(),
  outputMint: z.string(),
  makingAmount: z.string(),
  takingAmount: z.string(),
  remainingMakingAmount: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
})
export const JupiterTriggerOrdersResponse = z.object({
  orders: z.array(JupiterTriggerOrder),
  totalPages: z.number(),
  page: z.number(),
})
export type JupiterTriggerOrder = z.infer<typeof JupiterTriggerOrder>
export type JupiterTriggerOrdersResponse = z.infer<typeof JupiterTriggerOrdersResponse>

// --- Jupiter Token API v2 search (mint -> symbol) ---
export const JupiterToken = z.object({
  id: z.string(), // mint address
  symbol: z.string().optional(),
})
export const JupiterTokenSearchResponse = z.array(JupiterToken)
export type JupiterToken = z.infer<typeof JupiterToken>
