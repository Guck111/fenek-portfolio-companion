import { beforeEach, describe, expect, it } from "vitest"

import { clear, register } from "../../src/brokers/registry.js"
import { createPortfolioConcentrationTool } from "../../src/tools/analytics/portfolio_concentration.js"
import { createPortfolioOverviewTool } from "../../src/tools/analytics/portfolio_overview.js"

import { makeFakeBroker, parseToolResult } from "../helpers/fake-broker.js"

describe("analytics with a cost-basis-less (crypto-like) broker", () => {
  beforeEach(() => {
    clear()
  })

  it("overview and concentration run when positions omit unrealizedPnL and account omits invested/pnl", async () => {
    register(
      makeFakeBroker({
        id: "crypto",
        name: "Crypto Wallets",
        capabilities: { pies: false, dividends: false, transactions: false },
        account: {
          brokerId: "crypto",
          accountId: "wallets",
          currency: "USD",
          cash: { amount: 0, currency: "USD" },
          totalValue: { amount: 1500, currency: "USD" },
        },
        positions: [
          {
            brokerId: "crypto",
            ticker: "SOL",
            currency: "USD",
            quantity: 10,
            currentPrice: { amount: 150, currency: "USD" },
            marketValue: { amount: 1500, currency: "USD" },
          },
        ],
      }),
    )

    const overview = createPortfolioOverviewTool()
    const ov = parseToolResult(await overview.handler({})) as {
      totals: { marketValue: { amount: number; currency: string }[]; invested: unknown[] }
    }
    expect(ov.totals.marketValue).toEqual([{ amount: 1500, currency: "USD" }])
    expect(ov.totals.invested).toEqual([])

    const concentration = createPortfolioConcentrationTool()
    const co = parseToolResult(await concentration.handler({})) as {
      concentrations: { ticker: string }[]
    }
    expect(co.concentrations[0]?.ticker).toBe("SOL")
  })
})
