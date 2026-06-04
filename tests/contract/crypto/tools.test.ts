import { describe, it, expect } from "vitest"

import { createCryptoTools } from "../../../src/brokers/crypto/tools.js"
import { CryptoBroker } from "../../../src/brokers/crypto/index.js"

describe("crypto tools", () => {
  it("exposes positions, prices, and limit-orders tools", () => {
    const tools = createCryptoTools(new CryptoBroker())
    const names = tools.map((t) => t.tool.name).sort()
    expect(names).toEqual(["crypto_get_limit_orders", "crypto_get_positions", "crypto_get_prices"])
  })
})
