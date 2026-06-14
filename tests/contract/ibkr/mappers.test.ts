import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import {
  buildStatement,
  mapDividends,
  mapTransactions,
  type ParsedFlexStatement,
} from "../../../src/brokers/ibkr/index.js"
import type { CashTransaction } from "../../../src/brokers/ibkr/schemas.js"

const fixtureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/ibkr")
const readFixture = (name: string): string => fs.readFileSync(path.join(fixtureDir, name), "utf8")

function built(): ParsedFlexStatement {
  return buildStatement(readFixture("activity-flex.xml"))
}

describe("buildStatement — account", () => {
  it("maps base currency, NAV, cash and invested from the latest equity row", () => {
    const { account } = built()
    expect(account.brokerId).toBe("ibkr")
    expect(account.accountId).toBe("U0000000")
    expect(account.currency).toBe("USD")
    expect(account.totalValue).toEqual({ amount: 15500, currency: "USD" }) // latest reportDate 20240131
    expect(account.cash).toEqual({ amount: 1200, currency: "USD" })
    expect(account.invested).toEqual({ amount: 14300, currency: "USD" })
  })

  it("exposes statement metadata", () => {
    const { meta } = built()
    expect(meta.accountId).toBe("U0000000")
    expect(meta.fromDate).toBe("20240101")
    expect(meta.toDate).toBe("20240131")
    expect(meta.whenGenerated).toBe("20240201;120000")
  })
})

describe("buildStatement — positions", () => {
  it("maps a long position with cost basis and P&L", () => {
    const aapl = built().positions.find((p) => p.ticker === "AAPL")
    expect(aapl).toBeDefined()
    expect(aapl?.brokerId).toBe("ibkr")
    expect(aapl?.name).toBe("Apple Inc.")
    expect(aapl?.instrumentId).toBe("265598")
    expect(aapl?.quantity).toBe(100)
    expect(aapl?.currentPrice).toEqual({ amount: 190.5, currency: "USD" })
    expect(aapl?.marketValue).toEqual({ amount: 19050, currency: "USD" })
    expect(aapl?.averagePrice).toEqual({ amount: 150.25, currency: "USD" })
    expect(aapl?.unrealizedPnL).toEqual({ amount: 4025, currency: "USD" })
  })

  it("preserves a signed (short) quantity and decodes the entity in the name", () => {
    const pg = built().positions.find((p) => p.ticker === "PG")
    expect(pg?.quantity).toBe(-10)
    expect(pg?.name).toBe("Procter & Gamble Co.")
  })
})

describe("buildStatement — dividends with withholding-tax netting", () => {
  it("nets the withholding tax against the matching dividend", () => {
    const dividends = built().dividends
    expect(dividends).toHaveLength(1)
    const div = dividends[0]
    expect(div?.ticker).toBe("AAPL")
    expect(div?.grossAmount).toEqual({ amount: 24, currency: "USD" })
    expect(div?.taxWithheld).toEqual({ amount: 3.6, currency: "USD" })
    expect(div?.netAmount).toEqual({ amount: 20.4, currency: "USD" })
    expect(div?.id).toBe("1001")
  })
})

describe("buildStatement — transactions", () => {
  it("classifies cash movements and excludes dividend/tax rows", () => {
    const tx = built().transactions
    // 7 cash transactions − 1 Dividends − 1 Withholding Tax = 5
    expect(tx).toHaveLength(5)
    const byId = (id: string): string | undefined => tx.find((t) => t.id === id)?.kind
    expect(byId("1003")).toBe("deposit") // Deposits & Withdrawals +5000
    expect(byId("1004")).toBe("withdrawal") // Deposits & Withdrawals −500
    expect(byId("1005")).toBe("interest") // Broker Interest Received
    expect(byId("1006")).toBe("fee") // Other Fees
    expect(byId("1007")).toBe("other") // unknown future type
  })
})

describe("buildStatement — trades (raw IBKR form)", () => {
  it("maps trades with side, quantity, price and realized P&L", () => {
    const trades = built().trades
    expect(trades).toHaveLength(2)
    const buy = trades.find((t) => t.symbol === "AAPL")
    expect(buy?.buySell).toBe("BUY")
    expect(buy?.quantity).toBe(100)
    expect(buy?.tradePrice).toBe(150.25)
    const sell = trades.find((t) => t.symbol === "MSFT")
    expect(sell?.quantity).toBe(-20)
    expect(sell?.fifoPnlRealized).toBe(500)
  })
})

describe("single-account guard", () => {
  it("throws a directive error when the statement covers multiple accounts", () => {
    expect(() => buildStatement(readFixture("activity-flex-multi.xml"))).toThrow(/single account/i)
  })
})

describe("mapDividends — unmatched tax", () => {
  it("falls back to gross == net when no matching tax row exists", () => {
    const rows: CashTransaction[] = [
      { type: "Dividends", symbol: "KO", amount: 10, currency: "USD", dateTime: "20240301;120000" },
    ]
    const [div] = mapDividends(rows)
    expect(div?.grossAmount.amount).toBe(10)
    expect(div?.netAmount.amount).toBe(10)
    expect(div?.taxWithheld).toBeUndefined()
  })
})

describe("mapTransactions — unknown type passthrough", () => {
  it("routes an unrecognised action type to 'other' instead of throwing", () => {
    const rows: CashTransaction[] = [
      { type: "Brand New Action 2027", amount: 5, currency: "USD", dateTime: "20240301;120000" },
    ]
    expect(mapTransactions(rows)[0]?.kind).toBe("other")
  })
})
