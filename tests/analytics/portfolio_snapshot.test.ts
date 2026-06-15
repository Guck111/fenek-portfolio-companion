import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { callTool, clear, register, registerTools } from "../../src/brokers/registry.js"
import { _resetLicensingForTests, initLicensing } from "../../src/license/manager.js"
import { createPortfolioSnapshotTool } from "../../src/tools/analytics/portfolio_snapshot.js"
import type { Money } from "../../src/domain/money.js"
import type { OffAccountBalances } from "../../src/domain/balances.js"

import { makeFakeBroker, parseToolResult } from "../helpers/fake-broker.js"

interface SnapshotSource {
  id: string
  name: string
  status: "ok" | "empty" | "error"
  account?: { totalValue: Money }
  positions: { ticker: string; marketValue: Money }[]
  earn?: { coin: string; amount: number }[]
  derivatives?: { symbol: string }[]
  offAccount?: OffAccountBalances
  failures: { source: string; message: string }[]
  error?: string
}

interface Snapshot {
  sources: SnapshotSource[]
  totals: { marketValue: Money[] }
  excludedSources?: { broker: string; name: string; reason: string }[]
  note?: string
}

function run(): Promise<Snapshot> {
  return callTool("portfolio_snapshot", {}).then((r) => parseToolResult(r) as Snapshot)
}

const usdPosition = (brokerId: string, ticker: string, value: number) => ({
  brokerId,
  ticker,
  currency: "USD",
  quantity: 1,
  currentPrice: { amount: value, currency: "USD" },
  marketValue: { amount: value, currency: "USD" },
})

// An account that reads successfully but holds nothing — isolates off-account
// status cases from the "account not stubbed" rejection the fake otherwise emits.
const zeroAccount = (brokerId: string) => ({
  brokerId,
  accountId: "z",
  currency: "USD",
  cash: { amount: 0, currency: "USD" },
  totalValue: { amount: 0, currency: "USD" },
})

describe("portfolio_snapshot", () => {
  beforeEach(() => {
    clear()
    _resetLicensingForTests()
    registerTools([createPortfolioSnapshotTool()])
  })
  afterEach(() => {
    clear()
    _resetLicensingForTests()
  })

  it("returns no sources and empty totals when nothing is configured", async () => {
    const snap = await run()
    expect(snap.sources).toEqual([])
    expect(snap.totals.marketValue).toEqual([])
    expect(snap.excludedSources).toBeUndefined()
  })

  it("lists a source's full positions and folds market value into per-currency totals", async () => {
    register(
      makeFakeBroker({
        id: "t212",
        accountError: new Error("403 no account scope"),
        positions: [usdPosition("t212", "AAPL", 2000), usdPosition("t212", "MSFT", 500)],
      }),
      [],
    )
    const snap = await run()
    expect(snap.sources).toHaveLength(1)
    expect(snap.sources[0]?.status).toBe("ok")
    expect(snap.sources[0]?.positions.map((p) => p.ticker)).toEqual(["AAPL", "MSFT"])
    expect(snap.sources[0]?.account).toBeUndefined()
    expect(snap.totals.marketValue).toEqual([{ amount: 2500, currency: "USD" }])
  })

  it("includes Earn/derivatives/off-account buckets for sources that expose them", async () => {
    register(
      makeFakeBroker({
        id: "bybit",
        account: {
          brokerId: "bybit",
          accountId: "u",
          currency: "USD",
          cash: { amount: 0, currency: "USD" },
          totalValue: { amount: 1183, currency: "USD" },
        },
        positions: [usdPosition("bybit", "TON", 661)],
        earn: {
          positions: [{ brokerId: "bybit", family: "flexible", coin: "USDT", amount: 50 }],
          failures: [],
        },
        derivatives: {
          positions: [
            { brokerId: "bybit", symbol: "BTCUSDT", category: "linear", side: "long", size: 1 },
          ],
          failures: [],
        },
        offAccount: {
          totalValue: { amount: 1183, currency: "USD" },
          coins: [{ coin: "SFUND", quantity: 481 }],
        },
      }),
      [],
    )
    const src = (await run()).sources[0]
    expect(src?.earn?.[0]?.coin).toBe("USDT")
    expect(src?.derivatives?.[0]?.symbol).toBe("BTCUSDT")
    expect(src?.offAccount?.coins).toEqual([{ coin: "SFUND", quantity: 481 }])
  })

  it("omits bucket keys for sources that do not expose those methods", async () => {
    register(makeFakeBroker({ id: "t212", positions: [usdPosition("t212", "AAPL", 100)] }), [])
    const src = (await run()).sources[0]
    expect(src).not.toHaveProperty("earn")
    expect(src).not.toHaveProperty("derivatives")
    expect(src).not.toHaveProperty("offAccount")
  })

  it("marks a source empty when it holds nothing", async () => {
    register(
      makeFakeBroker({
        id: "t212",
        account: {
          brokerId: "t212",
          accountId: "1",
          currency: "USD",
          cash: { amount: 0, currency: "USD" },
          totalValue: { amount: 0, currency: "USD" },
        },
        positions: [],
      }),
      [],
    )
    expect((await run()).sources[0]?.status).toBe("empty")
  })

  it("marks a source error when its positions fetch fails, without sinking the rest", async () => {
    register(makeFakeBroker({ id: "bad", positionsError: new Error("Helius HTTP 401") }), [])
    register(makeFakeBroker({ id: "good", positions: [usdPosition("good", "AAPL", 100)] }), [])
    const snap = await run()
    const bad = snap.sources.find((s) => s.id === "bad")
    const good = snap.sources.find((s) => s.id === "good")
    expect(bad?.status).toBe("error")
    expect(bad?.error).toMatch(/401/)
    expect(bad?.positions).toEqual([])
    expect(good?.status).toBe("ok")
    // The failed source contributes nothing to totals; the healthy one still does.
    expect(snap.totals.marketValue).toEqual([{ amount: 100, currency: "USD" }])
  })

  it("keeps a source ok but records bucket sub-failures and whole-bucket failures", async () => {
    register(
      makeFakeBroker({
        id: "bybit",
        positions: [usdPosition("bybit", "TON", 661)],
        // one Earn family denied, but the report still returns
        earn: {
          positions: [],
          failures: [{ source: "onchain", message: "Earn permission missing" }],
        },
        // the whole derivatives bucket throws
        derivativesError: new Error("403 no derivatives scope"),
      }),
      [],
    )
    const src = (await run()).sources[0]
    expect(src?.status).toBe("ok")
    expect(src?.failures).toContainEqual({ source: "onchain", message: "Earn permission missing" })
    expect(src?.failures).toContainEqual({
      source: "derivatives",
      message: "403 no derivatives scope",
    })
  })

  it("reports totals per currency without summing across currencies", async () => {
    register(makeFakeBroker({ id: "usd", positions: [usdPosition("usd", "AAPL", 100)] }), [])
    register(
      makeFakeBroker({
        id: "eur",
        positions: [
          {
            brokerId: "eur",
            ticker: "ASML",
            currency: "EUR",
            quantity: 1,
            currentPrice: { amount: 50, currency: "EUR" },
            marketValue: { amount: 50, currency: "EUR" },
          },
        ],
      }),
      [],
    )
    const totals = (await run()).totals.marketValue
    expect(totals).toContainEqual({ amount: 100, currency: "USD" })
    expect(totals).toContainEqual({ amount: 50, currency: "EUR" })
    expect(totals).toHaveLength(2)
  })

  it("on the free tier excludes crypto sources, does not query them, and says so", async () => {
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: undefined,
      provider: null,
    })
    register(makeFakeBroker({ id: "t212", positions: [usdPosition("t212", "AAPL", 100)] }), [])
    // a pro (crypto) source — must be excluded and never queried on the free tier
    const bybit = makeFakeBroker({
      id: "bybitpro",
      positions: [usdPosition("bybitpro", "TON", 661)],
    })
    Object.assign(bybit, { tier: "pro" })
    register(bybit, [])

    const snap = await run()
    expect(snap.sources.map((s) => s.id)).toEqual(["t212"])
    expect(snap.excludedSources?.map((e) => e.broker)).toContain("bybitpro")
    expect(snap.note).toContain("Fenek Pro")
  })

  it("does not query a Pro source on the free tier (no outbound call)", async () => {
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: undefined,
      provider: null,
    })
    register(makeFakeBroker({ id: "t212", positions: [usdPosition("t212", "AAPL", 100)] }), [])
    let queried = 0
    const bybit = makeFakeBroker({ id: "bybitpro", positions: [usdPosition("bybitpro", "TON", 1)] })
    const origGetPositions = bybit.getPositions.bind(bybit)
    Object.assign(bybit, {
      tier: "pro",
      getPositions: () => {
        queried++
        return origGetPositions()
      },
    })
    register(bybit, [])

    await run()
    expect(queried).toBe(0)
  })

  it("does not mark a source empty when a money-bucket read failed and nothing else is held", async () => {
    // Empty Unified account but the Earn read is denied — the source is NOT
    // confirmed empty; whether Earn holds funds is unknown, so never say "empty".
    register(
      makeFakeBroker({
        id: "bybit",
        account: {
          brokerId: "bybit",
          accountId: "u",
          currency: "USD",
          cash: { amount: 0, currency: "USD" },
          totalValue: { amount: 0, currency: "USD" },
        },
        positions: [],
        earnError: new Error("403 Earn scope missing"),
      }),
      [],
    )
    const src = (await run()).sources[0]
    expect(src?.status).not.toBe("empty")
    expect(src?.failures).toContainEqual({ source: "earn", message: "403 Earn scope missing" })
  })

  it("records an account-read failure in failures while staying ok via positions", async () => {
    register(
      makeFakeBroker({
        id: "t212",
        accountError: new Error("403 account scope missing"),
        positions: [usdPosition("t212", "AAPL", 100)],
      }),
      [],
    )
    const src = (await run()).sources[0]
    expect(src?.status).toBe("ok")
    expect(src?.account).toBeUndefined()
    expect(src?.failures).toContainEqual({
      source: "account",
      message: "403 account scope missing",
    })
  })

  it("records an off-account whole-bucket failure and stays ok via positions", async () => {
    register(
      makeFakeBroker({
        id: "bybit",
        positions: [usdPosition("bybit", "TON", 661)],
        offAccountError: new Error("403 no wallet scope"),
      }),
      [],
    )
    const src = (await run()).sources[0]
    expect(src?.status).toBe("ok")
    expect(src?.failures).toContainEqual({ source: "off-account", message: "403 no wallet scope" })
  })

  it("counts off-account total value as data even with no coins", async () => {
    register(
      makeFakeBroker({
        id: "bybit",
        account: zeroAccount("bybit"),
        positions: [],
        offAccount: { totalValue: { amount: 1000, currency: "USD" }, coins: [] },
      }),
      [],
    )
    expect((await run()).sources[0]?.status).toBe("ok")
  })

  it("treats an off-account bucket with neither value nor coins as empty", async () => {
    register(
      makeFakeBroker({
        id: "bybit",
        account: zeroAccount("bybit"),
        positions: [],
        offAccount: { coins: [] },
      }),
      [],
    )
    expect((await run()).sources[0]?.status).toBe("empty")
  })

  it("includes an empty bucket array when the method exists but returns nothing", async () => {
    register(
      makeFakeBroker({
        id: "bybit",
        positions: [usdPosition("bybit", "TON", 1)],
        earn: { positions: [], failures: [] },
      }),
      [],
    )
    const src = (await run()).sources[0]
    expect(src).toHaveProperty("earn")
    expect(src?.earn).toEqual([])
  })
})
