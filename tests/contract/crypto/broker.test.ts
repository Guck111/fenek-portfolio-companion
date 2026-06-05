import { describe, it, expect } from "vitest"

import { assemblePositions, assembleAccount } from "../../../src/brokers/crypto/index.js"
import type { RawHolding } from "../../../src/brokers/crypto/types.js"

const holdings: RawHolding[] = [
  { chain: "solana", symbol: "SOL", amount: 10, coinId: "coingecko:solana" },
  { chain: "ton", symbol: "TON", amount: 100, coinId: "coingecko:the-open-network" },
  { chain: "solana", symbol: "SCAM", amount: 5, coinId: "solana:unpriced" },
]
const prices = new Map<string, number>([
  ["coingecko:solana", 150],
  ["coingecko:the-open-network", 5],
])

describe("crypto assembly", () => {
  it("builds USD positions for priced holdings and drops unpriced ones", () => {
    const { positions, dropped } = assemblePositions(holdings, prices)
    expect(positions).toHaveLength(2)
    expect(dropped).toBe(1)
    const sol = positions.find((p) => p.ticker === "SOL")
    expect(sol?.marketValue).toEqual({ amount: 1500, currency: "USD" })
    expect(sol?.currentPrice).toEqual({ amount: 150, currency: "USD" })
    expect(sol?.averagePrice).toBeUndefined()
    expect(sol?.unrealizedPnL).toBeUndefined()
  })

  it("account totals to sum of market values, no invested/pnl", () => {
    const { positions } = assemblePositions(holdings, prices)
    const account = assembleAccount(positions)
    expect(account.totalValue).toEqual({ amount: 2000, currency: "USD" })
    expect(account.cash).toEqual({ amount: 0, currency: "USD" })
    expect(account.invested).toBeUndefined()
    expect(account.unrealizedPnL).toBeUndefined()
  })
})
