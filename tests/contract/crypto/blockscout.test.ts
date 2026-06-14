import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import { EVM_NETWORKS } from "../../../src/brokers/crypto/chains/evm/networks.js"
import { mapEvmHoldings } from "../../../src/brokers/crypto/chains/evm/read.js"
import { BlockscoutAddress, BlockscoutTokenBalances } from "../../../src/brokers/crypto/schemas.js"

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/crypto/blockscout",
)
const read = (rel: string): unknown =>
  JSON.parse(fs.readFileSync(path.join(fixtureDir, rel), "utf8"))

const ethereum = EVM_NETWORKS.find((n) => n.id === "ethereum")

describe("Blockscout v2 contract (real-shaped fixtures)", () => {
  it("parses an address response and a token-balances list, tolerating extra fields", () => {
    expect(BlockscoutAddress.parse(read("address.json")).coin_balance).toBe("5688914350696581971")
    expect(BlockscoutTokenBalances.parse(read("token-balances.json")).length).toBe(3)
  })

  it("maps native + ERC-20 and filters ERC-721 / ERC-1155 from the real payload", () => {
    if (ethereum === undefined) throw new Error("ethereum network missing from EVM_NETWORKS")
    const coinBalance = BlockscoutAddress.parse(read("address.json")).coin_balance ?? null
    const tokens = BlockscoutTokenBalances.parse(read("token-balances.json"))

    const holdings = mapEvmHoldings(ethereum, coinBalance, tokens)

    expect(holdings.map((h) => h.symbol)).toEqual(["ETH", "USDC"]) // NFTs dropped
    const usdc = holdings.find((h) => h.symbol === "USDC")
    expect(usdc?.amount).toBeCloseTo(123.456789, 6)
    // coinId is the lowercase contract under the network's DefiLlama chain key.
    expect(usdc?.coinId).toBe("ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")
  })
})
