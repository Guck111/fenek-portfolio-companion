import { beforeEach, describe, expect, it } from "vitest"

import { callTool, clear, register, registerTools } from "../../src/brokers/registry.js"
import { createPortfolioOverviewTool } from "../../src/tools/analytics/portfolio_overview.js"

import { makeFakeBroker, parseToolResult } from "../helpers/fake-broker.js"

interface Overview {
  brokers: { id: string; name: string; hasAccountScope: boolean; positionCount: number }[]
  totals: {
    cash: { amount: number; currency: string }[]
    invested: { amount: number; currency: string }[]
    marketValue: { amount: number; currency: string }[]
    unrealizedPnL: { amount: number; currency: string }[]
  }
  topPositions: {
    ticker: string
    brokerId: string
    marketValue: { amount: number; currency: string }
  }[]
}

describe("portfolio_overview", () => {
  beforeEach(() => {
    clear()
    registerTools([createPortfolioOverviewTool()])
  })

  it("returns empty totals when no brokers are configured", async () => {
    const result = await callTool("portfolio_overview", {})
    expect(result.isError).toBeUndefined()
    const data = parseToolResult(result) as Overview
    expect(data.brokers).toEqual([])
    expect(data.totals.cash).toEqual([])
    expect(data.totals.marketValue).toEqual([])
    expect(data.topPositions).toEqual([])
  })

  it("aggregates positions from a broker without account scope", async () => {
    register(
      makeFakeBroker({
        id: "fake1",
        accountError: new Error("403 forbidden"),
        positions: [
          {
            brokerId: "fake1",
            ticker: "AAPL",
            currency: "USD",
            quantity: 10,
            averagePrice: { amount: 150, currency: "USD" },
            currentPrice: { amount: 200, currency: "USD" },
            marketValue: { amount: 2000, currency: "USD" },
            unrealizedPnL: { amount: 500, currency: "USD" },
          },
        ],
      }),
      [],
    )

    const result = await callTool("portfolio_overview", {})
    const data = parseToolResult(result) as Overview
    expect(data.brokers).toHaveLength(1)
    expect(data.brokers[0]?.hasAccountScope).toBe(false)
    expect(data.totals.marketValue).toEqual([{ amount: 2000, currency: "USD" }])
    expect(data.totals.invested).toEqual([{ amount: 1500, currency: "USD" }])
    expect(data.totals.unrealizedPnL).toEqual([{ amount: 500, currency: "USD" }])
    expect(data.topPositions).toHaveLength(1)
    expect(data.topPositions[0]?.ticker).toBe("AAPL")
  })

  it("uses account totals when account scope is available", async () => {
    register(
      makeFakeBroker({
        id: "fake1",
        account: {
          brokerId: "fake1",
          accountId: "1",
          currency: "USD",
          cash: { amount: 1000, currency: "USD" },
          invested: { amount: 5000, currency: "USD" },
          totalValue: { amount: 6500, currency: "USD" },
          unrealizedPnL: { amount: 500, currency: "USD" },
        },
        positions: [],
      }),
      [],
    )

    const data = parseToolResult(await callTool("portfolio_overview", {})) as Overview
    expect(data.totals.cash).toEqual([{ amount: 1000, currency: "USD" }])
    expect(data.totals.invested).toEqual([{ amount: 5000, currency: "USD" }])
    expect(data.totals.marketValue).toEqual([{ amount: 6500, currency: "USD" }])
    expect(data.brokers[0]?.hasAccountScope).toBe(true)
  })

  it("groups totals by currency across multiple brokers", async () => {
    register(
      makeFakeBroker({
        id: "broker-usd",
        account: {
          brokerId: "broker-usd",
          accountId: "1",
          currency: "USD",
          cash: { amount: 100, currency: "USD" },
          invested: { amount: 1000, currency: "USD" },
          totalValue: { amount: 1100, currency: "USD" },
          unrealizedPnL: { amount: 0, currency: "USD" },
        },
        positions: [],
      }),
      [],
    )
    register(
      makeFakeBroker({
        id: "broker-eur",
        account: {
          brokerId: "broker-eur",
          accountId: "2",
          currency: "EUR",
          cash: { amount: 50, currency: "EUR" },
          invested: { amount: 500, currency: "EUR" },
          totalValue: { amount: 550, currency: "EUR" },
          unrealizedPnL: { amount: 0, currency: "EUR" },
        },
        positions: [],
      }),
      [],
    )

    const data = parseToolResult(await callTool("portfolio_overview", {})) as Overview
    expect(data.totals.cash).toContainEqual({ amount: 100, currency: "USD" })
    expect(data.totals.cash).toContainEqual({ amount: 50, currency: "EUR" })
    expect(data.totals.cash).toHaveLength(2)
  })
})
