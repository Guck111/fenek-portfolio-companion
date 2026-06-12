import { describe, it, expect } from "vitest"

import {
  CHAINS,
  groupAddressesByChain,
  readHoldings,
} from "../../../src/brokers/crypto/registry.js"
import type { RawHolding } from "../../../src/brokers/crypto/types.js"

const SOL = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
const TON = "UQA5jmXrFi47-xvbqld9L2ah8udriH_kSYgozqhX69VeolFc"
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
  it("wires a keyless reader for every registered chain", () => {
    for (const chain of CHAINS) {
      expect(chain.read, `${chain.id} has no reader`).toBeTypeOf("function")
    }
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
    expect(result.unsupported).toEqual([])
  })

  it("reports detected addresses with no reader as unsupported, with their chain", async () => {
    const result = await readHoldings([BTC], () => undefined)
    expect(result.holdings).toEqual([])
    expect(result.failed).toEqual([])
    expect(result.unrecognized).toEqual([])
    expect(result.unsupported).toEqual([{ address: BTC, chain: "bitcoin" }])
  })
})
