import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import {
  DOGECOIN,
  mapBlockcypherBalance,
} from "../../../src/brokers/crypto/chains/utxo/blockcypher.js"
import { BlockcypherBalance } from "../../../src/brokers/crypto/schemas.js"

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/crypto",
)
const read = (rel: string): unknown =>
  JSON.parse(fs.readFileSync(path.join(fixtureDir, rel), "utf8"))

describe("mapBlockcypherBalance", () => {
  it("converts the final balance (smallest unit) to a native coin holding", () => {
    const balance = BlockcypherBalance.parse(read("blockcypher/doge-balance.json")).final_balance
    expect(mapBlockcypherBalance(DOGECOIN, balance)).toEqual([
      { chain: "dogecoin", symbol: "DOGE", amount: 1234, coinId: "coingecko:dogecoin" },
    ])
  })

  it("drops a zero balance", () => {
    expect(mapBlockcypherBalance(DOGECOIN, 0)).toEqual([])
  })
})
