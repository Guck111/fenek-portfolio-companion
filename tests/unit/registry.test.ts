import { describe, it, expect, beforeEach } from "vitest"

import type { IBroker } from "../../src/brokers/base.js"
import { register, get, list, clear } from "../../src/brokers/registry.js"

function makeFakeBroker(id: string): IBroker {
  return {
    id,
    name: `Fake ${id}`,
    capabilities: { pies: false, dividends: false, transactions: false },
    authenticate: () => Promise.resolve(),
    getAccount: () => Promise.reject(new Error("n/a")),
    getPositions: () => Promise.reject(new Error("n/a")),
    getTransactions: () => Promise.reject(new Error("n/a")),
    getDividends: () => Promise.reject(new Error("n/a")),
  }
}

describe("broker registry", () => {
  beforeEach(() => {
    clear()
  })

  it("returns empty list when no broker is registered", () => {
    expect(list()).toEqual([])
  })

  it("registers and retrieves a broker by id", () => {
    const broker = makeFakeBroker("fake")
    register(broker)
    expect(get("fake")).toBe(broker)
    expect(list()).toEqual([broker])
  })

  it("throws when registering the same id twice", () => {
    register(makeFakeBroker("dup"))
    expect(() => {
      register(makeFakeBroker("dup"))
    }).toThrow(/already registered/)
  })

  it("returns undefined for unknown id", () => {
    expect(get("nope")).toBeUndefined()
  })

  it("clears all registered brokers", () => {
    register(makeFakeBroker("a"))
    register(makeFakeBroker("b"))
    clear()
    expect(list()).toEqual([])
  })
})
