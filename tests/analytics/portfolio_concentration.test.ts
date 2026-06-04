import { beforeEach, describe, expect, it } from "vitest"

import { callTool, clear, register, registerTools } from "../../src/brokers/registry.js"
import { createPortfolioConcentrationTool } from "../../src/tools/analytics/portfolio_concentration.js"

import { makeFakeBroker, parseToolResult } from "../helpers/fake-broker.js"

interface ConcentrationOutput {
  portfolioTotalsByCurrency: { amount: number; currency: string }[]
  concentrations: {
    ticker: string
    brokers: string[]
    totalQuantity: number
    marketValue: { amount: number; currency: string }[]
    sharePercent?: number
  }[]
  errors: { brokerId: string; brokerName: string; error: string }[]
}

function position(opts: {
  brokerId: string
  ticker: string
  qty: number
  value: number
  currency?: string
}) {
  const ccy = opts.currency ?? "USD"
  return {
    brokerId: opts.brokerId,
    ticker: opts.ticker,
    currency: ccy,
    quantity: opts.qty,
    averagePrice: { amount: 100, currency: ccy },
    currentPrice: { amount: opts.value / opts.qty, currency: ccy },
    marketValue: { amount: opts.value, currency: ccy },
    unrealizedPnL: { amount: 0, currency: ccy },
  }
}

describe("portfolio_concentration", () => {
  beforeEach(() => {
    clear()
    registerTools([createPortfolioConcentrationTool()])
  })

  it("groups duplicate tickers across brokers and computes share", async () => {
    register(
      makeFakeBroker({
        id: "b1",
        positions: [
          position({ brokerId: "b1", ticker: "VOO", qty: 5, value: 2500 }),
          position({ brokerId: "b1", ticker: "AAPL", qty: 10, value: 2000 }),
        ],
      }),
      [],
    )
    register(
      makeFakeBroker({
        id: "b2",
        positions: [position({ brokerId: "b2", ticker: "VOO", qty: 3, value: 1500 })],
      }),
      [],
    )

    const data = parseToolResult(
      await callTool("portfolio_concentration", {}),
    ) as ConcentrationOutput
    expect(data.portfolioTotalsByCurrency).toEqual([{ amount: 6000, currency: "USD" }])

    const voo = data.concentrations.find((c) => c.ticker === "VOO")
    expect(voo).toBeDefined()
    expect(voo?.brokers.sort()).toEqual(["b1", "b2"])
    expect(voo?.totalQuantity).toBe(8)
    expect(voo?.marketValue).toEqual([{ amount: 4000, currency: "USD" }])
    expect(voo?.sharePercent).toBeCloseTo((4000 / 6000) * 100, 2)

    const aapl = data.concentrations.find((c) => c.ticker === "AAPL")
    expect(aapl?.sharePercent).toBeCloseTo((2000 / 6000) * 100, 2)
  })

  it("respects topN and minShare filters", async () => {
    register(
      makeFakeBroker({
        id: "b1",
        positions: [
          position({ brokerId: "b1", ticker: "BIG", qty: 1, value: 10000 }),
          position({ brokerId: "b1", ticker: "SMALL", qty: 1, value: 100 }),
        ],
      }),
      [],
    )

    const top1 = parseToolResult(
      await callTool("portfolio_concentration", { topN: 1 }),
    ) as ConcentrationOutput
    expect(top1.concentrations).toHaveLength(1)
    expect(top1.concentrations[0]?.ticker).toBe("BIG")

    const filtered = parseToolResult(
      await callTool("portfolio_concentration", { minShare: 0.5 }),
    ) as ConcentrationOutput
    expect(filtered.concentrations).toHaveLength(1)
    expect(filtered.concentrations[0]?.ticker).toBe("BIG")
  })

  it("keeps aggregating the healthy brokers when one broker fails", async () => {
    register(
      makeFakeBroker({
        id: "good",
        positions: [position({ brokerId: "good", ticker: "AAPL", qty: 10, value: 2000 })],
      }),
      [],
    )
    register(makeFakeBroker({ id: "bad", positionsError: new Error("Helius HTTP 401") }), [])

    const result = await callTool("portfolio_concentration", {})
    expect(result.isError).toBeUndefined()
    const data = parseToolResult(result) as ConcentrationOutput
    expect(data.concentrations.map((c) => c.ticker)).toContain("AAPL")
    expect(data.errors).toHaveLength(1)
    expect(data.errors[0]?.brokerId).toBe("bad")
    expect(data.errors[0]?.error).toMatch(/401/)
  })
})
