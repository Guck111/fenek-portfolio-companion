import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import {
  TonAccount,
  TonJettonsResponse,
  DefiLlamaPricesResponse,
} from "../../../src/brokers/crypto/schemas.js"

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/crypto",
)

function readFixture(rel: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, rel), "utf8"))
}

describe("crypto schemas", () => {
  it("parses tonapi account", () => {
    expect(TonAccount.safeParse(readFixture("ton/account.json")).success).toBe(true)
  })
  it("parses tonapi jettons", () => {
    expect(TonJettonsResponse.safeParse(readFixture("ton/jettons.json")).success).toBe(true)
  })
  it("parses DefiLlama prices", () => {
    expect(DefiLlamaPricesResponse.safeParse(readFixture("defillama/prices.json")).success).toBe(
      true,
    )
  })
})
