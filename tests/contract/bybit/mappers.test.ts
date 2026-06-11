import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import {
  mapWalletBalance,
  mapAccountDetail,
  assembleAccount,
  mapOpenOrders,
} from "../../../src/brokers/bybit/index.js"
import {
  BybitEnvelope,
  BybitWalletBalanceResult,
  BybitOrderListResult,
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
