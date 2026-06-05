import { describe, it, expect } from "vitest"

import {
  CHAINS,
  groupAddressesByChain,
  readHoldings,
} from "../../../src/brokers/crypto/registry.js"
import type { RawHolding } from "../../../src/brokers/crypto/types.js"

const SOL = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
const TON = "UQDvuEbnbSAL2cgDsSBKklmonE2J13waCvzHRCLRb9V5kKiM"
const BTC = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"

describe("groupAddressesByChain", () => {
  it("groups recognised addresses by chain", () => {
    const { byChain, unrecognized } = groupAddressesByChain([SOL, TON, BTC])
    expect(byChain.get("solana")).toEqual([SOL])
    expect(byChain.get("ton")).toEqual([TON])
    expect(byChain.get("bitcoin")).toEqual([BTC])
    expect(unrecognized).toEqual([])
  })

  it("collects unrecognised addresses instead of throwing", () => {
    const { byChain, unrecognized } = groupAddressesByChain(["garbage!!!", SOL])
    expect(byChain.get("solana")).toEqual([SOL])
    expect(unrecognized).toEqual(["garbage!!!"])
  })

  it("groups multiple addresses of the same chain together, in order", () => {
    const sol2 = "11111111111111111111111111111111"
    const { byChain } = groupAddressesByChain([SOL, sol2])
    expect(byChain.get("solana")).toEqual([SOL, sol2])
  })
})

describe("CHAINS readers", () => {
  it("wires keyless readers for Solana and TON", () => {
    expect(CHAINS.find((c) => c.id === "solana")?.read).toBeTypeOf("function")
    expect(CHAINS.find((c) => c.id === "ton")?.read).toBeTypeOf("function")
  })

  it("leaves chains without a built reader undefined", () => {
    expect(CHAINS.find((c) => c.id === "bitcoin")?.read).toBeUndefined()
    expect(CHAINS.find((c) => c.id === "dogecoin")?.read).toBeUndefined()
  })
})

describe("readHoldings", () => {
  const solHolding: RawHolding = {
    chain: "solana",
    symbol: "SOL",
    amount: 1,
    coinId: "coingecko:solana",
  }

  it("reads per chain, isolates a failing reader, and reports unrecognised addresses", async () => {
    const readers: Partial<Record<string, (a: string) => Promise<RawHolding[]>>> = {
      solana: () => Promise.resolve([solHolding]),
      ton: () => Promise.reject(new Error("rpc down")),
    }
    const result = await readHoldings([SOL, TON, "garbage!!!"], (c) => readers[c])
    expect(result.holdings).toEqual([solHolding])
    expect(result.failed).toEqual([TON])
    expect(result.unrecognized).toEqual(["garbage!!!"])
  })

  it("skips chains that have no reader", async () => {
    const result = await readHoldings([BTC], () => undefined)
    expect(result.holdings).toEqual([])
    expect(result.failed).toEqual([])
    expect(result.unrecognized).toEqual([])
  })
})
