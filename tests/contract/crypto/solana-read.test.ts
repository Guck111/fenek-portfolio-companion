import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import { mapSolanaHoldings } from "../../../src/brokers/crypto/chains/solana/read.js"
import { SolanaTokenAccountsResponse } from "../../../src/brokers/crypto/schemas.js"

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/crypto",
)
const read = (rel: string): unknown =>
  JSON.parse(fs.readFileSync(path.join(fixtureDir, rel), "utf8"))

const accounts = SolanaTokenAccountsResponse.parse(read("solana/token-accounts.json")).result.value
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

describe("mapSolanaHoldings", () => {
  it("maps the native lamports balance to a SOL holding", () => {
    const holdings = mapSolanaHoldings(1_500_000_000, [], new Map())
    expect(holdings).toEqual([
      { chain: "solana", symbol: "SOL", amount: 1.5, coinId: "coingecko:solana" },
    ])
  })

  it("omits SOL when the lamports balance is zero", () => {
    expect(mapSolanaHoldings(0, [], new Map())).toEqual([])
  })

  it("maps token accounts to holdings, resolving symbols and dropping zero balances", () => {
    const symbols = new Map([[USDC, "USDC"]])
    const holdings = mapSolanaHoldings(0, accounts, symbols)
    expect(holdings).toEqual([
      { chain: "solana", symbol: "USDC", amount: 2.5, coinId: `solana:${USDC}` },
    ])
  })

  it("falls back to a shortened mint when the symbol is unknown", () => {
    const holdings = mapSolanaHoldings(0, accounts, new Map())
    expect(holdings[0]?.symbol).toBe("EPjF…Dt1v")
  })
})
