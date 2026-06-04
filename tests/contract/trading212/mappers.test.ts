import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import {
  buildHistoryPath,
  extractCursor,
  mapDividend,
  mapPieDetails,
  mapPieListEntry,
  mapPosition,
  mapTransaction,
} from "../../../src/brokers/trading212/index.js"
import {
  T212DividendPage,
  T212PieDetails,
  T212PieList,
  T212Positions,
  T212TransactionPage,
} from "../../../src/brokers/trading212/schemas.js"

const fixtureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/t212")

function readFixture(name: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, name), "utf8"))
}

describe("trading212 mappers", () => {
  it("maps T212 position to domain Position", () => {
    const positions = T212Positions.parse(readFixture("positions.json"))
    const first = positions[0]
    expect(first).toBeDefined()
    if (first === undefined) return

    const mapped = mapPosition(first)
    expect(mapped.brokerId).toBe("t212")
    expect(mapped.ticker).toBe("DEMOA_EQ")
    expect(mapped.name).toBe("Demo Alpha")
    expect(mapped.currency).toBe("GBX")
    expect(mapped.quantity).toBe(10)
    expect(mapped.averagePrice).toEqual({ amount: 1000, currency: "GBX" })
    expect(mapped.currentPrice).toEqual({ amount: 1100, currency: "GBX" })
    expect(mapped.marketValue).toEqual({ amount: 110, currency: "EUR" })
    expect(mapped.unrealizedPnL).toEqual({ amount: 10, currency: "EUR" })
  })

  it("maps T212 pie list entry to domain Pie", () => {
    const pies = T212PieList.parse(readFixture("pies.json"))
    const first = pies[0]
    expect(first).toBeDefined()
    if (first === undefined) return

    const mapped = mapPieListEntry(first, "EUR")
    expect(mapped.id).toBe("1")
    expect(mapped.name).toBe("Pie 1")
    expect(mapped.invested).toEqual({ amount: 1000, currency: "EUR" })
    expect(mapped.currentValue).toEqual({ amount: 1100, currency: "EUR" })
    expect(mapped.unrealizedPnL).toEqual({ amount: 100, currency: "EUR" })
    expect(mapped.cashBalance).toEqual({ amount: 0.5, currency: "EUR" })
  })

  it("maps T212 pie details with name lookup and slice totals", () => {
    const details = T212PieDetails.parse(readFixture("pie_details.json"))
    const nameLookup = (ticker: string): string | undefined => {
      if (ticker === "DEMOA_EQ") return "Demo Alpha"
      if (ticker === "DEMOB_EQ") return "Demo Beta"
      return undefined
    }
    const mapped = mapPieDetails(details, "EUR", nameLookup)

    expect(mapped.id).toBe("1")
    expect(mapped.name).toBe("Demo Pie")
    expect(mapped.invested.currency).toBe("EUR")
    // Sum of slice invested values: 500 + 300 + 200 = 1000
    expect(mapped.invested.amount).toBeCloseTo(1000, 2)
    // Current: 600 + 290 + 210 = 1100
    expect(mapped.currentValue.amount).toBeCloseTo(1100, 2)
    expect(mapped.unrealizedPnL.amount).toBeCloseTo(100, 2)

    expect(mapped.slices).toHaveLength(3)
    const beta = mapped.slices.find((s) => s.ticker === "DEMOB_EQ")
    expect(beta?.name).toBe("Demo Beta")
    expect(beta?.targetWeight).toBe(0.3)
    expect(beta?.currentWeight).toBe(0.29)

    const gamma = mapped.slices.find((s) => s.ticker === "DEMOC_EQ")
    expect(gamma?.name).toBeUndefined()
  })

  it("maps T212 transactions and extracts cursor from nextPagePath", () => {
    const page = T212TransactionPage.parse(readFixture("transactions.json"))
    const mapped = page.items.map(mapTransaction)
    expect(mapped[0]?.kind).toBe("deposit")
    expect(mapped[0]?.amount).toEqual({ amount: 1000, currency: "EUR" })
    expect(mapped[1]?.kind).toBe("withdrawal")
    expect(mapped[1]?.amount.amount).toBe(-100)

    const cursor = extractCursor(page.nextPagePath)
    expect(cursor).toBe("1700000000000")
  })

  it("maps empty T212 dividends page to empty Page", () => {
    const page = T212DividendPage.parse(readFixture("dividends_empty.json"))
    const items = page.items.map((item) => mapDividend(item, "EUR"))
    expect(items).toEqual([])
    expect(extractCursor(page.nextPagePath)).toBeUndefined()
  })

  it("buildHistoryPath includes only set params", () => {
    expect(buildHistoryPath("/equity/history/orders", {})).toBe("/equity/history/orders")
    expect(buildHistoryPath("/equity/history/orders", { limit: 5 })).toBe(
      "/equity/history/orders?limit=5",
    )
    expect(buildHistoryPath("/equity/history/orders", { limit: 5, cursor: "abc" })).toBe(
      "/equity/history/orders?limit=5&cursor=abc",
    )
  })

  it("extractCursor returns undefined for null and malformed paths", () => {
    expect(extractCursor(null)).toBeUndefined()
    expect(extractCursor("/no/cursor/here")).toBeUndefined()
  })
})
