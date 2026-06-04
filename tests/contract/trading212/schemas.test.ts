import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import {
  T212DividendPage,
  T212HistoricalOrderPage,
  T212InstrumentList,
  T212PieDetails,
  T212PieList,
  T212Positions,
  T212TransactionPage,
} from "../../../src/brokers/trading212/schemas.js"

const fixtureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/t212")

function readFixture(name: string): unknown {
  const text = fs.readFileSync(path.join(fixtureDir, name), "utf8")
  return JSON.parse(text)
}

describe("trading212 schemas", () => {
  it("parses /equity/positions", () => {
    const result = T212Positions.safeParse(readFixture("positions.json"))
    expect(result.success).toBe(true)
  })

  it("parses /equity/pies", () => {
    const result = T212PieList.safeParse(readFixture("pies.json"))
    expect(result.success).toBe(true)
  })

  it("parses /equity/pies/{id}", () => {
    const result = T212PieDetails.safeParse(readFixture("pie_details.json"))
    expect(result.success).toBe(true)
  })

  it("parses /equity/history/transactions", () => {
    const result = T212TransactionPage.safeParse(readFixture("transactions.json"))
    expect(result.success).toBe(true)
  })

  it("parses /equity/history/orders", () => {
    const result = T212HistoricalOrderPage.safeParse(readFixture("order_history.json"))
    expect(result.success).toBe(true)
  })

  it("parses empty /equity/history/dividends", () => {
    const result = T212DividendPage.safeParse(readFixture("dividends_empty.json"))
    expect(result.success).toBe(true)
  })

  it("parses /equity/metadata/instruments", () => {
    const result = T212InstrumentList.safeParse(readFixture("instruments.json"))
    expect(result.success).toBe(true)
  })
})
