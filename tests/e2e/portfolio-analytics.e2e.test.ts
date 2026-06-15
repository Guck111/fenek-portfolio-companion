import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clear, register, registerTools } from "../../src/brokers/registry.js"
import type { Money } from "../../src/domain/money.js"
import type { Position } from "../../src/domain/position.js"
import { _resetLicensingForTests, initLicensing } from "../../src/license/manager.js"
import { createPortfolioOverviewTool } from "../../src/tools/analytics/portfolio_overview.js"
import { createPortfolioSnapshotTool } from "../../src/tools/analytics/portfolio_snapshot.js"
import { connectE2EClient, useHermeticStateDir } from "../helpers/e2e.js"
import { makeFakeBroker, parseToolResult } from "../helpers/fake-broker.js"

// End-to-end across the real MCP boundary for the CROSS-BROKER analytics tools.
// Fake brokers are registered, the analytics tools are mounted, and the server is
// driven through an in-process MCP client. Asserts the normalized JSON Claude
// actually receives for portfolio_snapshot / portfolio_overview — aggregation
// across sources plus the Pro-tier exclusion behavior — not internal state.

interface ExcludedSource {
  readonly broker: string
  readonly name: string
  readonly reason: string
}

interface SnapshotSource {
  readonly id: string
  readonly name: string
  readonly status: "ok" | "empty" | "error"
  readonly positions: readonly { readonly ticker: string; readonly marketValue: Money }[]
}

interface Snapshot {
  readonly sources: readonly SnapshotSource[]
  readonly totals: { readonly marketValue: readonly Money[] }
  readonly excludedSources?: readonly ExcludedSource[]
  readonly note?: string
}

interface Overview {
  readonly brokers: readonly { readonly id: string; readonly positionCount: number }[]
  readonly totals: { readonly marketValue: readonly Money[] }
  readonly topPositions: readonly { readonly ticker: string; readonly marketValue: Money }[]
  readonly excludedSources?: readonly ExcludedSource[]
  readonly note?: string
}

const usdPosition = (brokerId: string, ticker: string, value: number): Position => ({
  brokerId,
  ticker,
  currency: "USD",
  quantity: 1,
  currentPrice: { amount: value, currency: "USD" },
  marketValue: { amount: value, currency: "USD" },
})

describe("e2e: cross-broker analytics over the MCP tool boundary", () => {
  let restoreStateDir: () => void

  beforeEach(() => {
    restoreStateDir = useHermeticStateDir()
    clear()
    _resetLicensingForTests()
  })

  afterEach(() => {
    clear()
    _resetLicensingForTests()
    vi.unstubAllGlobals()
    restoreStateDir()
  })

  it("portfolio_snapshot aggregates across two free-visible brokers", async () => {
    registerTools([createPortfolioSnapshotTool()])
    register(
      makeFakeBroker({
        id: "t212",
        positions: [usdPosition("t212", "AAPL", 2000), usdPosition("t212", "MSFT", 500)],
      }),
      [],
    )
    register(
      makeFakeBroker({
        id: "ibkr",
        positions: [usdPosition("ibkr", "VTI", 1500)],
      }),
      [],
    )

    const harness = await connectE2EClient()
    try {
      const res = (await harness.client.callTool({
        name: "portfolio_snapshot",
        arguments: {},
      })) as CallToolResult
      expect(res.isError).toBeFalsy()
      const snap = parseToolResult(res) as Snapshot

      const t212 = snap.sources.find((s) => s.id === "t212")
      const ibkr = snap.sources.find((s) => s.id === "ibkr")
      expect(t212?.status).toBe("ok")
      expect(ibkr?.status).toBe("ok")
      expect(t212?.positions.map((p) => p.ticker)).toEqual(["AAPL", "MSFT"])
      expect(ibkr?.positions.map((p) => p.ticker)).toEqual(["VTI"])
      // Both single-currency (USD) sources fold into one per-currency total.
      expect(snap.totals.marketValue).toEqual([{ amount: 4000, currency: "USD" }])
      expect(snap.excludedSources).toBeUndefined()
    } finally {
      await harness.close()
    }
  })

  it("portfolio_snapshot excludes a Pro source on the free tier and counts only free sources", async () => {
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: undefined,
      provider: null,
    })
    registerTools([createPortfolioSnapshotTool()])
    register(makeFakeBroker({ id: "t212", positions: [usdPosition("t212", "AAPL", 100)] }), [])
    const bybit = makeFakeBroker({
      id: "bybit",
      positions: [usdPosition("bybit", "TON", 661)],
    })
    Object.assign(bybit, { tier: "pro" })
    register(bybit, [])

    const harness = await connectE2EClient()
    try {
      const res = (await harness.client.callTool({
        name: "portfolio_snapshot",
        arguments: {},
      })) as CallToolResult
      expect(res.isError).toBeFalsy()
      const snap = parseToolResult(res) as Snapshot

      // The Pro source is reported as excluded, never as a visible source.
      expect(snap.sources.map((s) => s.id)).toEqual(["t212"])
      const excluded = snap.excludedSources?.find((e) => e.broker === "bybit")
      expect(excluded?.reason).toBe("pro-license-required")
      expect(snap.note).toContain("Fenek Pro")
      // Totals cover the free source only — the Pro source's value is absent.
      expect(snap.totals.marketValue).toEqual([{ amount: 100, currency: "USD" }])
    } finally {
      await harness.close()
    }
  })

  it("portfolio_overview reports headline totals across the free brokers", async () => {
    registerTools([createPortfolioOverviewTool()])
    register(
      makeFakeBroker({
        id: "t212",
        positions: [usdPosition("t212", "AAPL", 2000), usdPosition("t212", "MSFT", 500)],
      }),
      [],
    )
    register(
      makeFakeBroker({
        id: "ibkr",
        positions: [usdPosition("ibkr", "VTI", 1500)],
      }),
      [],
    )

    const harness = await connectE2EClient()
    try {
      const res = (await harness.client.callTool({
        name: "portfolio_overview",
        arguments: {},
      })) as CallToolResult
      expect(res.isError).toBeFalsy()
      const overview = parseToolResult(res) as Overview

      expect(overview.brokers.map((b) => b.id).sort()).toEqual(["ibkr", "t212"])
      // Accounts are not stubbed here, so value folds from position market value.
      expect(overview.totals.marketValue).toEqual([{ amount: 4000, currency: "USD" }])
      // Largest position by raw market-value amount ranks first.
      expect(overview.topPositions[0]?.ticker).toBe("AAPL")
      expect(overview.topPositions[0]?.marketValue).toEqual({ amount: 2000, currency: "USD" })
      expect(overview.excludedSources).toBeUndefined()
    } finally {
      await harness.close()
    }
  })
})
