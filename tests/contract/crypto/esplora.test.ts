import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import {
  BITCOIN,
  esploraBalanceSats,
  mapEsploraBalance,
} from "../../../src/brokers/crypto/chains/utxo/esplora.js"
import { EsploraAddress } from "../../../src/brokers/crypto/schemas.js"

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/crypto",
)
const read = (rel: string): unknown =>
  JSON.parse(fs.readFileSync(path.join(fixtureDir, rel), "utf8"))

describe("esploraBalanceSats", () => {
  it("nets confirmed and mempool funded/spent sums", () => {
    const stats = EsploraAddress.parse(read("esplora/address.json"))
    // (200_000_000 - 80_000_000) + (5_000_000 - 1_600_000)
    expect(esploraBalanceSats(stats)).toBe(123_400_000)
  })
})

describe("mapEsploraBalance", () => {
  it("converts satoshis to a native coin holding", () => {
    expect(mapEsploraBalance(BITCOIN, 123_400_000)).toEqual([
      { chain: "bitcoin", symbol: "BTC", amount: 1.234, coinId: "coingecko:bitcoin" },
    ])
  })

  it("drops a zero balance", () => {
    expect(mapEsploraBalance(BITCOIN, 0)).toEqual([])
  })
})
