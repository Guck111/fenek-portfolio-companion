import { describe, it, expect } from "vitest"

import { createCryptoTools } from "../../../src/brokers/crypto/tools.js"
import { CryptoBroker } from "../../../src/brokers/crypto/index.js"

describe("crypto tools", () => {
  it("exposes positions, prices, and limit-orders tools", () => {
    const tools = createCryptoTools(new CryptoBroker())
    const names = tools.map((t) => t.tool.name).sort()
    expect(names).toEqual(["crypto_get_limit_orders", "crypto_get_positions", "crypto_get_prices"])
  })

  it("rejects oversized coin ids before they reach the price API", async () => {
    const tools = createCryptoTools(new CryptoBroker())
    const prices = tools.find((t) => t.tool.name === "crypto_get_prices")
    if (prices === undefined) throw new Error("crypto_get_prices not found")
    const result = await prices.handler({ coins: ["x".repeat(10_000)] })
    expect(result.isError).toBe(true)
    const text = result.content.map((c) => ("text" in c ? c.text : "")).join(" ")
    expect(text).toContain("Invalid arguments")
  })
})
