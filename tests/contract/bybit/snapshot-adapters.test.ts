import { describe, it, expect } from "vitest"

import {
  toDerivativeReport,
  toEarnReport,
  toOffAccountBalances,
} from "../../../src/brokers/bybit/index.js"

describe("bybit toEarnReport", () => {
  it("passes positions through and renames family-keyed failures to source", () => {
    const report = toEarnReport({
      positions: [{ brokerId: "bybit", family: "flexible", coin: "USDT", amount: 100 }],
      failures: [{ family: "onchain", message: "Earn permission missing" }],
    })
    expect(report.positions).toHaveLength(1)
    expect(report.positions[0]?.coin).toBe("USDT")
    expect(report.failures).toEqual([{ source: "onchain", message: "Earn permission missing" }])
  })
})

describe("bybit toDerivativeReport", () => {
  it("passes positions through and renames category-keyed failures to source", () => {
    const report = toDerivativeReport({
      positions: [
        { brokerId: "bybit", symbol: "BTCUSDT", category: "linear", side: "long", size: 1 },
      ],
      failures: [{ category: "option", message: "no option access" }],
    })
    expect(report.positions[0]?.symbol).toBe("BTCUSDT")
    expect(report.failures).toEqual([{ source: "option", message: "no option access" }])
  })
})

describe("bybit toOffAccountBalances", () => {
  it("maps all-account total equity to USD and funding coins to quantities", () => {
    const off = toOffAccountBalances({
      totalEquity: 1182.93,
      accounts: [],
      funding: [
        { coin: "SFUND", quantity: 481.05 },
        { coin: "DOGE", quantity: 1000, transferable: 1000 },
      ],
      failures: [],
    })
    expect(off.totalValue).toEqual({ amount: 1182.93, currency: "USD" })
    expect(off.coins).toEqual([
      { coin: "SFUND", quantity: 481.05 },
      { coin: "DOGE", quantity: 1000 },
    ])
  })

  it("omits totalValue when no all-account equity is reported and tolerates no funding", () => {
    const off = toOffAccountBalances({ accounts: [], failures: [] })
    expect(off.totalValue).toBeUndefined()
    expect(off.coins).toEqual([])
  })
})
