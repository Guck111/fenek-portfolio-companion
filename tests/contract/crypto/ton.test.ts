import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import { mapTonHoldings } from "../../../src/brokers/crypto/chains/ton.js"
import { TonAccount, TonJettonsResponse } from "../../../src/brokers/crypto/schemas.js"

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/crypto",
)
const read = (rel: string): unknown =>
  JSON.parse(fs.readFileSync(path.join(fixtureDir, rel), "utf8"))

describe("ton holdings mapper", () => {
  it("maps TON account + jettons to RawHolding[]", () => {
    const account = TonAccount.parse(read("ton/account.json"))
    const jettons = TonJettonsResponse.parse(read("ton/jettons.json"))
    const holdings = mapTonHoldings(account, jettons)
    const ton = holdings.find((h) => h.symbol === "TON")
    expect(ton).toBeDefined()
    expect(ton?.coinId).toBe("coingecko:the-open-network")
    for (const h of holdings) expect(h.chain).toBe("ton")
  })
})
