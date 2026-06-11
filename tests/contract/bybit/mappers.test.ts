import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import {
  mapWalletBalance,
  mapAccountDetail,
  mapDerivativePositions,
  mapKeyInfo,
  assembleAccount,
  mapOpenOrders,
} from "../../../src/brokers/bybit/index.js"
import {
  BybitEnvelope,
  BybitWalletBalanceResult,
  BybitOrderListResult,
  BybitPositionListResult,
} from "../../../src/brokers/bybit/schemas.js"

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/bybit",
)

function loadResult(): BybitWalletBalanceResult {
  const raw: unknown = JSON.parse(
    fs.readFileSync(path.join(fixtureDir, "wallet-balance.json"), "utf8"),
  )
  return BybitWalletBalanceResult.parse(BybitEnvelope.parse(raw).result)
}

describe("bybit mapWalletBalance", () => {
  it("maps priced coins to USD positions and drops coins without usdValue", () => {
    const { positions, dropped } = mapWalletBalance(loadResult())
    expect(positions).toHaveLength(2)
    expect(dropped).toBe(1)

    const btc = positions.find((p) => p.ticker === "BTC")
    expect(btc?.brokerId).toBe("bybit")
    expect(btc?.currency).toBe("USD")
    expect(btc?.quantity).toBe(0.5)
    expect(btc?.marketValue).toEqual({ amount: 30000, currency: "USD" })
    expect(btc?.currentPrice).toEqual({ amount: 60000, currency: "USD" })
    expect(btc?.averagePrice).toBeUndefined()
    expect(btc?.unrealizedPnL).toBeUndefined()

    const usdt = positions.find((p) => p.ticker === "USDT")
    expect(usdt?.currentPrice).toEqual({ amount: 1, currency: "USD" })
  })

  it("assembleAccount totals to sum of market values, cash 0, no invested/pnl", () => {
    const { positions } = mapWalletBalance(loadResult())
    const account = assembleAccount(positions)
    expect(account.brokerId).toBe("bybit")
    expect(account.accountId).toBe("unified")
    expect(account.totalValue).toEqual({ amount: 31000, currency: "USD" })
    expect(account.cash).toEqual({ amount: 0, currency: "USD" })
    expect(account.invested).toBeUndefined()
    expect(account.unrealizedPnL).toBeUndefined()
  })
})

describe("bybit mapAccountDetail", () => {
  it("maps account-level totals, margin rates, and per-coin detail", () => {
    const d = mapAccountDetail(loadResult())
    expect(d).not.toBeNull()
    expect(d?.totalEquity).toBe(31100)
    expect(d?.totalWalletBalance).toBe(31000)
    expect(d?.totalMarginBalance).toBe(30950)
    expect(d?.totalAvailableBalance).toBe(28000)
    expect(d?.totalPerpUPL).toBe(-12.5)
    expect(d?.accountIMRate).toBe(0.012)
    expect(d?.accountMMRate).toBe(0.002)

    const btc = d?.coins.find((c) => c.coin === "BTC")
    expect(btc?.quantity).toBe(0.5)
    expect(btc?.usdValue).toBe(30000)
    expect(btc?.unrealisedPnl).toBe(5)
    expect(btc?.cumRealisedPnl).toBe(-1)
    expect(btc?.borrowAmount).toBe(0)
    expect(btc?.locked).toBe(0.1)
    // Bybit sends "" for fields without a value — must come through as undefined.
    expect(btc?.accruedInterest).toBeUndefined()
  })

  it("assembleAccount prefers totalEquity and totalPerpUPL when detail is present", () => {
    const { positions } = mapWalletBalance(loadResult())
    const detail = mapAccountDetail(loadResult())
    const acc = assembleAccount(positions, detail ?? undefined)
    expect(acc.totalValue).toEqual({ amount: 31100, currency: "USD" })
    expect(acc.unrealizedPnL).toEqual({ amount: -12.5, currency: "USD" })
  })
})

describe("bybit mapDerivativePositions", () => {
  const result = {
    list: [
      {
        symbol: "BTCUSDT",
        side: "Buy",
        size: "0.4",
        avgPrice: "58000",
        markPrice: "60000",
        positionValue: "24000",
        unrealisedPnl: "800",
        curRealisedPnl: "-10.5",
        cumRealisedPnl: "120",
        leverage: "5",
        liqPrice: "41000",
        takeProfit: "70000",
        stopLoss: "",
        positionIdx: 0,
        updatedTime: "1700000000000",
      },
      { symbol: "ETHUSDT", side: "None", size: "0", positionIdx: 0 },
    ],
    nextPageCursor: "",
  }

  it("maps open positions, normalizing side and string numbers", () => {
    const positions = mapDerivativePositions(BybitPositionListResult.parse(result), "linear")
    expect(positions).toHaveLength(1)
    const btc = positions[0]
    expect(btc?.brokerId).toBe("bybit")
    expect(btc?.category).toBe("linear")
    expect(btc?.symbol).toBe("BTCUSDT")
    expect(btc?.side).toBe("long")
    expect(btc?.size).toBe(0.4)
    expect(btc?.entryPrice).toBe(58000)
    expect(btc?.markPrice).toBe(60000)
    expect(btc?.positionValue).toBe(24000)
    expect(btc?.unrealizedPnL).toBe(800)
    expect(btc?.realizedPnLCurrent).toBe(-10.5)
    expect(btc?.realizedPnLCumulative).toBe(120)
    expect(btc?.leverage).toBe(5)
    expect(btc?.liquidationPrice).toBe(41000)
    expect(btc?.takeProfit).toBe(70000)
    // "" means "not set" and must come through as undefined, not 0.
    expect(btc?.stopLoss).toBeUndefined()
    expect(btc?.updatedAt).toBe("1700000000000")
  })

  it("drops zero-size rows and maps Sell to short", () => {
    const sells = mapDerivativePositions(
      BybitPositionListResult.parse({
        list: [{ symbol: "SOLUSDT", side: "Sell", size: "10" }],
      }),
      "linear",
    )
    expect(sells[0]?.side).toBe("short")
    const empty = mapDerivativePositions(
      BybitPositionListResult.parse({ list: [{ symbol: "X", side: "None", size: "0" }] }),
      "inverse",
    )
    expect(empty).toHaveLength(0)
  })
})

describe("bybit mapKeyInfo", () => {
  const NOW = Date.parse("2026-06-11T00:00:00Z")

  it("reports a healthy read-only key without warnings", () => {
    const report = mapKeyInfo(
      {
        readOnly: 1,
        permissions: { Wallet: ["AccountTransfer"], ContractTrade: [] },
        ips: ["*"],
        expiredAt: "2026-12-01T00:00:00Z",
        isMaster: true,
      },
      { unifiedMarginStatus: 5, marginMode: "REGULAR_MARGIN" },
      NOW,
    )
    expect(report.readOnly).toBe(true)
    expect(report.permissions?.["Wallet"]).toEqual(["AccountTransfer"])
    expect(report.marginMode).toBe("REGULAR_MARGIN")
    expect(report.unifiedMarginStatus).toBe(5)
    expect(report.daysToExpiry).toBe(173)
    expect(report.warnings).toEqual([])
  })

  it("warns when the key is NOT read-only", () => {
    const report = mapKeyInfo({ readOnly: 0 }, null, NOW)
    expect(report.readOnly).toBe(false)
    expect(report.warnings.some((w) => w.includes("read-only"))).toBe(true)
  })

  it("warns when the key expires within 14 days", () => {
    const report = mapKeyInfo({ readOnly: 1, expiredAt: "2026-06-20T00:00:00Z" }, null, NOW)
    expect(report.daysToExpiry).toBe(9)
    expect(report.warnings.some((w) => w.includes("expires"))).toBe(true)
  })
})

describe("bybit mapOpenOrders", () => {
  it("maps raw orders to structured OpenOrder, normalizing side and string numbers", () => {
    const raw: unknown = JSON.parse(
      fs.readFileSync(path.join(fixtureDir, "open-orders.json"), "utf8"),
    )
    const result = BybitOrderListResult.parse(BybitEnvelope.parse(raw).result)
    const orders = mapOpenOrders(result, "spot")
    expect(orders).toHaveLength(2)

    const btc = orders.find((o) => o.symbol === "BTCUSDT")
    expect(btc?.brokerId).toBe("bybit")
    expect(btc?.orderId).toBe("1700000000000000001")
    expect(btc?.side).toBe("buy")
    expect(btc?.orderType).toBe("Limit")
    expect(btc?.price).toBe(50000)
    expect(btc?.quantity).toBe(0.01)
    expect(btc?.filledQuantity).toBe(0)
    expect(btc?.status).toBe("New")
    expect(btc?.category).toBe("spot")
    expect(btc?.createdAt).toBe("1700000000000")

    const eth = orders.find((o) => o.symbol === "ETHUSDT")
    expect(eth?.side).toBe("sell")
    expect(eth?.filledQuantity).toBe(0.2)
    expect(eth?.status).toBe("PartiallyFilled")
  })
})
