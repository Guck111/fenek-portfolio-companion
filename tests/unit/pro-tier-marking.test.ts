import { describe, expect, it } from "vitest"

import type { BybitBroker } from "../../src/brokers/bybit/index.js"
import { createBybitTools } from "../../src/brokers/bybit/tools.js"
import type { CryptoBroker } from "../../src/brokers/crypto/index.js"
import { createCryptoTools } from "../../src/brokers/crypto/tools.js"
import type { Trading212Broker } from "../../src/brokers/trading212/index.js"
import { createTrading212Tools } from "../../src/brokers/trading212/tools.js"

describe("pro tier marking", () => {
  it("every bybit tool is pro", () => {
    const bindings = createBybitTools({} as unknown as BybitBroker)
    expect(bindings.length).toBe(7)
    expect(bindings.every((b) => b.tier === "pro")).toBe(true)
  })

  it("every crypto tool is pro", () => {
    const bindings = createCryptoTools({} as unknown as CryptoBroker)
    expect(bindings.length).toBe(3)
    expect(bindings.every((b) => b.tier === "pro")).toBe(true)
  })

  it("trading212 tools stay free", () => {
    const bindings = createTrading212Tools({} as unknown as Trading212Broker)
    expect(bindings.every((b) => b.tier === undefined)).toBe(true)
  })
})
