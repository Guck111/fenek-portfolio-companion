import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import {
  BybitEnvelope,
  BybitWalletBalanceResult,
  BybitOrderListResult,
} from "../../../src/brokers/bybit/schemas.js"

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/bybit",
)

function readFixture(name: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, name), "utf8"))
}

describe("bybit schemas", () => {
  it("parses the V5 envelope", () => {
    expect(BybitEnvelope.safeParse(readFixture("wallet-balance.json")).success).toBe(true)
  })

  it("parses the wallet-balance result", () => {
    const env = BybitEnvelope.parse(readFixture("wallet-balance.json"))
    expect(BybitWalletBalanceResult.safeParse(env.result).success).toBe(true)
  })

  it("parses the order/realtime result", () => {
    const env = BybitEnvelope.parse(readFixture("open-orders.json"))
    expect(BybitOrderListResult.safeParse(env.result).success).toBe(true)
  })
})
