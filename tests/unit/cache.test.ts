import { describe, it, expect } from "vitest"

import { TTLCache } from "../../src/utils/cache.js"

describe("TTLCache size bound", () => {
  it("evicts the oldest entry once maxEntries is reached", () => {
    const cache = new TTLCache<string, number>(60_000, 3)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    cache.set("d", 4)
    expect(cache.size).toBe(3)
    expect(cache.get("a")).toBeUndefined()
    expect(cache.get("b")).toBe(2)
    expect(cache.get("d")).toBe(4)
  })

  it("does not evict when overwriting an existing key at capacity", () => {
    const cache = new TTLCache<string, number>(60_000, 2)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("a", 10)
    expect(cache.size).toBe(2)
    expect(cache.get("a")).toBe(10)
    expect(cache.get("b")).toBe(2)
  })

  it("bounds growth with a default cap when none is given", () => {
    const cache = new TTLCache<string, number>(60_000)
    for (let i = 0; i < 5000; i++) cache.set(`k${String(i)}`, i)
    expect(cache.size).toBeLessThanOrEqual(1000)
  })

  it("rejects a non-positive maxEntries", () => {
    expect(() => new TTLCache<string, number>(60_000, 0)).toThrow()
  })
})
