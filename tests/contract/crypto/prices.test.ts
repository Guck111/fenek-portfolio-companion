import { describe, it, expect } from "vitest"

import { parsePrices } from "../../../src/brokers/crypto/prices.js"

describe("defillama price parsing", () => {
  it("maps coins response to a coinId->usd map", () => {
    const raw = {
      coins: {
        "coingecko:solana": { price: 150.5, symbol: "SOL" },
        "coingecko:the-open-network": { price: 5.25, symbol: "TON" },
      },
    }
    const map = parsePrices(raw)
    expect(map.get("coingecko:solana")).toBe(150.5)
    expect(map.get("coingecko:the-open-network")).toBe(5.25)
    expect(map.get("missing")).toBeUndefined()
  })
})
