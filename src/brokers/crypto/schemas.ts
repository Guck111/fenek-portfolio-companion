import { z } from "zod"

// --- Solana JSON-RPC (public node, keyless) ---
export const SolanaBalanceResponse = z.object({
  result: z.object({ value: z.number() }),
})
export const SolanaTokenAmount = z.object({
  amount: z.string(), // raw integer string
  decimals: z.number(),
  uiAmount: z.number().nullable().optional(),
})
export const SolanaTokenAccount = z.object({
  account: z.object({
    data: z.object({
      parsed: z.object({
        info: z.object({
          mint: z.string(),
          tokenAmount: SolanaTokenAmount,
        }),
      }),
    }),
  }),
})
export const SolanaTokenAccountsResponse = z.object({
  result: z.object({ value: z.array(SolanaTokenAccount) }),
})
export type SolanaTokenAccount = z.infer<typeof SolanaTokenAccount>

// --- esplora (mempool.space / blockstream — keyless UTXO balance) ---
const EsploraTxoStats = z.object({
  funded_txo_sum: z.number(),
  spent_txo_sum: z.number(),
})
export const EsploraAddress = z.object({
  chain_stats: EsploraTxoStats,
  mempool_stats: EsploraTxoStats,
})
export type EsploraAddress = z.infer<typeof EsploraAddress>

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
