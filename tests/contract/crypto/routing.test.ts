import { describe, it, expect } from "vitest"

import { CHAINS, groupAddressesByChain } from "../../../src/brokers/crypto/registry.js"

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
