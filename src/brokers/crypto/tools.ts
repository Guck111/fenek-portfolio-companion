import { z } from "zod"

import { parseArgs, safeRun } from "../../tools/result.js"
import type { ToolBinding } from "../base.js"

import type { CryptoBroker } from "./index.js"
import { getPrices } from "./prices.js"

const EmptyArgs = z.object({}).strict()
const PricesArgs = z.object({
  coins: z.array(z.string().min(1).max(100)).min(1).max(50),
})

export function createCryptoTools(broker: CryptoBroker): readonly ToolBinding[] {
  return [
    {
      tool: {
        name: "crypto_get_positions",
        annotations: { title: "Crypto Wallets: Holdings", openWorldHint: true },
        description:
          "Returns the user's on-chain crypto holdings across the configured wallet addresses (Ethereum & EVM L2s — Arbitrum, Optimism, Base, Polygon — plus Solana, TON, Bitcoin, Litecoin, Dogecoin; the chain of each address is auto-detected, and a single 0x address is read across every EVM network) valued in USD: token symbol, quantity, current price, and market value. No cost basis or P&L (on-chain wallets do not record purchase price). Unpriced/spam tokens are omitted. Also lists any addresses that were unrecognized, on a not-yet-supported chain, or failed to load, so you can tell the user which inputs were skipped. Covers only the configured crypto wallets; for a complete cross-source picture (every configured source and money bucket) use portfolio_snapshot.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getReport())
      },
      tier: "pro",
    },
    {
      tool: {
        name: "crypto_get_prices",
        annotations: { title: "Crypto Wallets: Token Prices (Watchlist)", openWorldHint: true },
        description:
          "Returns current USD prices for arbitrary crypto assets (watchlist). Each coin is a DefiLlama id like 'coingecko:solana', 'coingecko:the-open-network', 'solana:<mint>', or 'ton:<jetton-address>'. Use for assets the user does not hold.",
        inputSchema: {
          type: "object",
          properties: {
            coins: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
              maxItems: 50,
              description:
                "DefiLlama coin ids, e.g. ['coingecko:solana','coingecko:the-open-network'].",
            },
          },
          required: ["coins"],
          additionalProperties: false,
        },
      },
      handler: async (args) => {
        const r = parseArgs(PricesArgs, args)
        if (!r.ok) return r.result
        return safeRun(async () => {
          const prices = await getPrices(r.data.coins)
          return Object.fromEntries(prices)
        })
      },
      tier: "pro",
    },
    {
      tool: {
        name: "crypto_get_limit_orders",
        annotations: {
          title: "Crypto Wallets: Jupiter Limit Orders (Solana)",
          openWorldHint: true,
        },
        description:
          "Returns open limit orders on Jupiter (Solana) for your configured Solana wallet address(es), via Jupiter's public Trigger v1 API (pair, side, limit price, quantity, filled quantity, status). IMPORTANT: Jupiter's current Limit Order V2 keeps order details private (hidden by Jupiter until execution), so V2 orders are NOT exposed by any public API — an empty result does NOT mean the user has no open orders; advise checking jup.ag directly. Funds locked by open orders still show up as reduced wallet balances in crypto_get_positions. Read-only.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getLimitOrders())
      },
      tier: "pro",
    },
  ]
}
