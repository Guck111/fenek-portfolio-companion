import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type { IBroker } from "../../src/brokers/base.js"
import { clear, register } from "../../src/brokers/registry.js"
import { partitionBrokersByTier } from "../../src/license/gate.js"
import { _resetLicensingForTests, initLicensing } from "../../src/license/manager.js"
import { createPortfolioDividendHistoryTool } from "../../src/tools/analytics/portfolio_dividend_history.js"
import { createPortfolioOverviewTool } from "../../src/tools/analytics/portfolio_overview.js"

function fakeBroker(id: string, tier?: "pro"): IBroker {
  return {
    id,
    name: `Fake ${id}`,
    capabilities: { pies: false, dividends: false, transactions: false },
    ...(tier !== undefined ? { tier } : {}),
    authenticate: () => Promise.resolve(),
    getAccount: () => Promise.reject(new Error("no account scope")),
    getPositions: () =>
      Promise.resolve([
        {
          brokerId: id,
          ticker: `${id.toUpperCase()}X`,
          currency: "USD",
          quantity: 1,
          currentPrice: { amount: 10, currency: "USD" },
          marketValue: { amount: 10, currency: "USD" },
        },
      ]),
    getTransactions: () => Promise.reject(new Error("n/a")),
    getDividends: () => Promise.reject(new Error("n/a")),
  }
}

interface OverviewShape {
  brokers: readonly { id: string }[]
  excludedSources?: readonly { broker: string; reason: string }[]
  note?: string
}

async function runOverview(): Promise<OverviewShape> {
  const result = await createPortfolioOverviewTool().handler({})
  return JSON.parse((result.content[0] as { text: string }).text) as OverviewShape
}

describe("analytics tier filtering", () => {
  beforeEach(() => {
    clear()
    _resetLicensingForTests()
    register(fakeBroker("t212fake"))
    register(fakeBroker("bybitfake", "pro"))
  })
  afterEach(() => {
    clear()
    _resetLicensingForTests()
  })

  it("partition keeps all brokers visible while the paywall is inactive", () => {
    const { visible, excludedSources } = partitionBrokersByTier([
      fakeBroker("a"),
      fakeBroker("b", "pro"),
    ])
    expect(visible.map((b) => b.id)).toEqual(["a", "b"])
    expect(excludedSources).toEqual([])
  })

  it("partition excludes pro brokers on free tier with a structured reason", () => {
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: undefined,
      provider: null,
    })
    const { visible, excludedSources } = partitionBrokersByTier([
      fakeBroker("a"),
      fakeBroker("b", "pro"),
    ])
    expect(visible.map((b) => b.id)).toEqual(["a"])
    expect(excludedSources).toEqual([
      { broker: "b", name: "Fake b", reason: "pro-license-required" },
    ])
  })

  it("portfolio_overview includes crypto while the paywall is off, without excludedSources", async () => {
    const overview = await runOverview()
    expect(overview.brokers.map((b) => b.id).sort()).toEqual(["bybitfake", "t212fake"])
    expect(overview.excludedSources).toBeUndefined()
    expect(overview.note).toBeUndefined()
  })

  it("portfolio_overview on free tier drops crypto and reports it honestly", async () => {
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: undefined,
      provider: null,
    })
    const overview = await runOverview()
    expect(overview.brokers.map((b) => b.id)).toEqual(["t212fake"])
    expect(overview.excludedSources).toEqual([
      { broker: "bybitfake", name: "Fake bybitfake", reason: "pro-license-required" },
    ])
    expect(overview.note).toContain("Fenek Pro")
  })

  it("dividend_history with zero eligible brokers still explains the excluded crypto source", async () => {
    // Free tier; the only dividend-capable source would be crypto (pro), and the
    // free broker has no dividends capability — the early empty return must
    // still carry excludedSources instead of looking like "no data".
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: undefined,
      provider: null,
    })
    const result = await createPortfolioDividendHistoryTool().handler({})
    const body = JSON.parse((result.content[0] as { text: string }).text) as {
      eligibleBrokers: number
      groups: readonly unknown[]
      excludedSources?: readonly { broker: string }[]
      note?: string
    }
    expect(body.eligibleBrokers).toBe(0)
    expect(body.groups).toEqual([])
    expect(body.excludedSources).toEqual([
      { broker: "bybitfake", name: "Fake bybitfake", reason: "pro-license-required" },
    ])
    expect(body.note).toContain("Fenek Pro")
  })
})
