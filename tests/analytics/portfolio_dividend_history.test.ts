import { beforeEach, describe, expect, it } from "vitest"

import { callTool, clear, register, registerTools } from "../../src/brokers/registry.js"
import { createPortfolioDividendHistoryTool } from "../../src/tools/analytics/portfolio_dividend_history.js"
import type { Dividend } from "../../src/domain/dividend.js"

import { makeFakeBroker, parseToolResult } from "../helpers/fake-broker.js"

interface HistoryOutput {
  eligibleBrokers: number
  totalDividends: number
  groupBy: string
  groups: {
    group: string
    paymentCount: number
    gross: { amount: number; currency: string }[]
    net: { amount: number; currency: string }[]
  }[]
  errors: { brokerId: string; brokerName: string; error: string }[]
}

function div(opts: {
  ticker: string
  date: string
  gross: number
  net?: number
  currency?: string
}): Dividend {
  const ccy = opts.currency ?? "USD"
  return {
    brokerId: "b1",
    id: `${opts.ticker}-${opts.date}`,
    ticker: opts.ticker,
    grossAmount: { amount: opts.gross, currency: ccy },
    netAmount: { amount: opts.net ?? opts.gross, currency: ccy },
    paidDate: opts.date,
  }
}

describe("portfolio_dividend_history", () => {
  beforeEach(() => {
    clear()
    registerTools([createPortfolioDividendHistoryTool()])
  })

  it("returns 0 eligibleBrokers when no broker supports dividends", async () => {
    register(makeFakeBroker({ id: "no-divs", positions: [] }), [])
    const data = parseToolResult(await callTool("portfolio_dividend_history", {})) as HistoryOutput
    expect(data.eligibleBrokers).toBe(0)
    expect(data.groups).toEqual([])
  })

  it("groups dividends by year by default and sums by currency", async () => {
    register(
      makeFakeBroker({
        id: "b1",
        dividends: [
          div({ ticker: "AAPL", date: "2024-03-15T00:00:00Z", gross: 5, net: 4 }),
          div({ ticker: "AAPL", date: "2024-06-15T00:00:00Z", gross: 5, net: 4 }),
          div({ ticker: "AAPL", date: "2025-03-15T00:00:00Z", gross: 6, net: 5 }),
        ],
      }),
      [],
    )

    const data = parseToolResult(await callTool("portfolio_dividend_history", {})) as HistoryOutput
    expect(data.eligibleBrokers).toBe(1)
    expect(data.totalDividends).toBe(3)
    expect(data.groupBy).toBe("year")
    expect(data.groups).toHaveLength(2)
    const y2024 = data.groups.find((g) => g.group === "2024")
    expect(y2024?.paymentCount).toBe(2)
    expect(y2024?.gross).toEqual([{ amount: 10, currency: "USD" }])
    expect(y2024?.net).toEqual([{ amount: 8, currency: "USD" }])
  })

  it("groups by ticker when requested and applies date filter", async () => {
    register(
      makeFakeBroker({
        id: "b1",
        dividends: [
          div({ ticker: "AAPL", date: "2024-01-01T00:00:00Z", gross: 5 }),
          div({ ticker: "MSFT", date: "2024-01-01T00:00:00Z", gross: 7 }),
          div({ ticker: "AAPL", date: "2023-01-01T00:00:00Z", gross: 100 }),
        ],
      }),
      [],
    )

    const data = parseToolResult(
      await callTool("portfolio_dividend_history", {
        groupBy: "ticker",
        fromDate: "2024-01-01T00:00:00Z",
      }),
    ) as HistoryOutput
    expect(data.totalDividends).toBe(2)
    expect(data.groups.find((g) => g.group === "AAPL")?.gross).toEqual([
      { amount: 5, currency: "USD" },
    ])
    expect(data.groups.find((g) => g.group === "MSFT")?.gross).toEqual([
      { amount: 7, currency: "USD" },
    ])
  })

  it("keeps aggregating dividends when one broker fails", async () => {
    register(
      makeFakeBroker({
        id: "good",
        dividends: [div({ ticker: "KO", date: "2025-03-01T00:00:00Z", gross: 10 })],
      }),
      [],
    )
    register(
      makeFakeBroker({
        id: "bad",
        capabilities: { dividends: true },
        dividendsError: new Error("Trading 212 rate limit exceeded"),
      }),
      [],
    )

    const result = await callTool("portfolio_dividend_history", {})
    expect(result.isError).toBeUndefined()
    const data = parseToolResult(result) as HistoryOutput
    expect(data.totalDividends).toBe(1)
    expect(data.errors).toHaveLength(1)
    expect(data.errors[0]?.brokerId).toBe("bad")
  })
})
