import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import {
  childrenNamed,
  extractStatements,
  firstNamed,
  type XmlElement,
} from "../../../src/brokers/ibkr/xml.js"
import {
  AccountInformation,
  CashReportCurrencyRow,
  CashTransaction,
  EquitySummaryRow,
  flexNumber,
  OpenPosition,
  Trade,
} from "../../../src/brokers/ibkr/schemas.js"

const fixtureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/ibkr")
const xml = fs.readFileSync(path.join(fixtureDir, "activity-flex.xml"), "utf8")

function statement(): XmlElement {
  const stmt = extractStatements(xml)[0]
  if (stmt === undefined) throw new Error("fixture has no FlexStatement")
  return stmt
}

function rows(sectionTag: string, rowTag: string): readonly Record<string, string>[] {
  const section = firstNamed(statement(), sectionTag)
  if (section === undefined) throw new Error(`fixture missing section ${sectionTag}`)
  return childrenNamed(section, rowTag).map((el) => el.attrs)
}

describe("ibkr flexNumber", () => {
  it("strips thousands separators and coerces", () => {
    expect(flexNumber.parse("1,234.5")).toBe(1234.5)
  })
  it("handles negative values", () => {
    expect(flexNumber.parse("-10")).toBe(-10)
  })
})

describe("ibkr Flex schemas parse the fixture", () => {
  it("parses AccountInformation", () => {
    const info = firstNamed(statement(), "AccountInformation")
    if (info === undefined) throw new Error("no AccountInformation")
    expect(AccountInformation.safeParse(info.attrs).success).toBe(true)
  })

  it("parses every EquitySummaryByReportDateInBase row", () => {
    const parsed = rows("EquitySummaryInBase", "EquitySummaryByReportDateInBase").map((r) =>
      EquitySummaryRow.safeParse(r),
    )
    expect(parsed.every((p) => p.success)).toBe(true)
    expect(parsed).toHaveLength(2)
  })

  it("parses every CashReportCurrency row (including BASE_SUMMARY)", () => {
    const parsed = rows("CashReport", "CashReportCurrency").map((r) =>
      CashReportCurrencyRow.safeParse(r),
    )
    expect(parsed.every((p) => p.success)).toBe(true)
  })

  it("parses every OpenPosition row", () => {
    const parsed = rows("OpenPositions", "OpenPosition").map((r) => OpenPosition.safeParse(r))
    expect(parsed.every((p) => p.success)).toBe(true)
  })

  it("parses every CashTransaction row (incl. unknown type)", () => {
    const parsed = rows("CashTransactions", "CashTransaction").map((r) =>
      CashTransaction.safeParse(r),
    )
    expect(parsed.every((p) => p.success)).toBe(true)
    expect(parsed).toHaveLength(7)
  })

  it("parses every Trade row", () => {
    const parsed = rows("Trades", "Trade").map((r) => Trade.safeParse(r))
    expect(parsed.every((p) => p.success)).toBe(true)
  })
})
