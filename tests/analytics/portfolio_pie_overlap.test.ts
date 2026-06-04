import { beforeEach, describe, expect, it } from "vitest"

import { callTool, clear, register, registerTools } from "../../src/brokers/registry.js"
import { createPortfolioPieOverlapTool } from "../../src/tools/analytics/portfolio_pie_overlap.js"
import type { PieDetails } from "../../src/domain/pie.js"

import { makeFakeBroker, parseToolResult } from "../helpers/fake-broker.js"

interface OverlapOutput {
  eligibleBrokers: number
  overlappingTickers: {
    ticker: string
    pieCount: number
    memberships: { pieId: string; pieName: string; targetWeight: number }[]
  }[]
  errors: { brokerId: string; brokerName: string; error: string }[]
}

const m = (amount: number) => ({ amount, currency: "USD" })

function makePie(
  id: string,
  name: string,
  slices: { ticker: string; weight: number }[],
): PieDetails {
  return {
    brokerId: "b1",
    id,
    name,
    invested: m(1000),
    currentValue: m(1100),
    unrealizedPnL: m(100),
    slices: slices.map((s) => ({
      ticker: s.ticker,
      targetWeight: s.weight,
      currentWeight: s.weight,
      quantity: 1,
      invested: m(s.weight * 1000),
      currentValue: m(s.weight * 1100),
      unrealizedPnL: m(s.weight * 100),
    })),
  }
}

describe("portfolio_pie_overlap", () => {
  beforeEach(() => {
    clear()
    registerTools([createPortfolioPieOverlapTool()])
  })

  it("returns 0 eligibleBrokers when nothing supports pies", async () => {
    register(makeFakeBroker({ id: "no-pies", positions: [] }), [])
    const data = parseToolResult(await callTool("portfolio_pie_overlap", {})) as OverlapOutput
    expect(data.eligibleBrokers).toBe(0)
    expect(data.overlappingTickers).toEqual([])
  })

  it("finds tickers that appear in more than one pie", async () => {
    const pie1 = makePie("p1", "Tech", [
      { ticker: "VOO", weight: 0.5 },
      { ticker: "AAPL", weight: 0.5 },
    ])
    const pie2 = makePie("p2", "Core", [
      { ticker: "VOO", weight: 0.7 },
      { ticker: "BND", weight: 0.3 },
    ])
    register(
      makeFakeBroker({
        id: "b1",
        pies: [
          {
            brokerId: "b1",
            id: "p1",
            name: "Tech",
            invested: m(1000),
            currentValue: m(1100),
            unrealizedPnL: m(100),
          },
          {
            brokerId: "b1",
            id: "p2",
            name: "Core",
            invested: m(2000),
            currentValue: m(2100),
            unrealizedPnL: m(100),
          },
        ],
        pieDetails: { p1: pie1, p2: pie2 },
      }),
      [],
    )

    const data = parseToolResult(await callTool("portfolio_pie_overlap", {})) as OverlapOutput
    expect(data.eligibleBrokers).toBe(1)
    expect(data.overlappingTickers).toHaveLength(1)
    const voo = data.overlappingTickers[0]
    expect(voo?.ticker).toBe("VOO")
    expect(voo?.pieCount).toBe(2)
    const pieIds = voo?.memberships.map((m) => m.pieId).sort()
    expect(pieIds).toEqual(["p1", "p2"])
  })

  it("keeps analyzing the healthy brokers when one broker fails", async () => {
    const pie1 = makePie("p1", "Tech", [{ ticker: "VOO", weight: 1 }])
    const pie2 = makePie("p2", "Core", [{ ticker: "VOO", weight: 1 }])
    register(
      makeFakeBroker({
        id: "good",
        pies: [
          {
            brokerId: "good",
            id: "p1",
            name: "Tech",
            invested: m(1000),
            currentValue: m(1100),
            unrealizedPnL: m(100),
          },
          {
            brokerId: "good",
            id: "p2",
            name: "Core",
            invested: m(1000),
            currentValue: m(1100),
            unrealizedPnL: m(100),
          },
        ],
        pieDetails: { p1: pie1, p2: pie2 },
      }),
      [],
    )
    register(
      makeFakeBroker({
        id: "bad",
        capabilities: { pies: true },
        piesError: new Error("Bybit HTTP 500"),
      }),
      [],
    )

    const result = await callTool("portfolio_pie_overlap", {})
    expect(result.isError).toBeUndefined()
    const data = parseToolResult(result) as OverlapOutput
    expect(data.overlappingTickers.map((t) => t.ticker)).toContain("VOO")
    expect(data.errors).toHaveLength(1)
    expect(data.errors[0]?.brokerId).toBe("bad")
  })
})
