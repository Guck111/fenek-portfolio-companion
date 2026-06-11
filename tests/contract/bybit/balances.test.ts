import { describe, it, expect } from "vitest"

import {
  buildBalancesOverview,
  mapAssetOverview,
  mapFundingBalance,
} from "../../../src/brokers/bybit/index.js"
import {
  BybitAssetOverviewResult,
  BybitCoinsBalanceResult,
} from "../../../src/brokers/bybit/schemas.js"
import { AuthError } from "../../../src/utils/errors.js"

describe("bybit mapAssetOverview", () => {
  it("maps total equity and per-account holdings including categorized accounts", () => {
    const overview = mapAssetOverview(
      BybitAssetOverviewResult.parse({
        totalEquity: "12345.67",
        list: [
          {
            accountType: "FundingAccount",
            totalEquity: "345.67",
            valuationCurrency: "USD",
            coinDetail: [{ coin: "TON", equity: "100" }],
          },
          {
            accountType: "Earn",
            totalEquity: "2000",
            valuationCurrency: "USD",
            categories: [
              {
                category: "Easy Earn",
                equity: "2000",
                coinDetail: [{ coin: "USDT", equity: "2000" }],
              },
            ],
          },
        ],
      }),
    )
    expect(overview.totalEquity).toBe(12345.67)
    expect(overview.accounts).toHaveLength(2)
    const funding = overview.accounts.find((a) => a.type === "FundingAccount")
    expect(funding?.equity).toBe(345.67)
    expect(funding?.coins?.[0]).toEqual({ coin: "TON", equity: 100 })
    const earn = overview.accounts.find((a) => a.type === "Earn")
    expect(earn?.categories?.[0]?.category).toBe("Easy Earn")
    expect(earn?.categories?.[0]?.coins?.[0]).toEqual({ coin: "USDT", equity: 2000 })
  })
})

describe("bybit mapFundingBalance", () => {
  it("maps funding-wallet coins and drops zero balances", () => {
    const coins = mapFundingBalance(
      BybitCoinsBalanceResult.parse({
        accountType: "FUND",
        balance: [
          { coin: "DOGE", walletBalance: "1000", transferBalance: "1000", bonus: "" },
          { coin: "DUST", walletBalance: "0", transferBalance: "0", bonus: "" },
        ],
      }),
    )
    expect(coins).toHaveLength(1)
    expect(coins[0]).toEqual({ coin: "DOGE", quantity: 1000, transferable: 1000 })
  })
})

describe("bybit buildBalancesOverview", () => {
  it("tolerates one source failing and reports it", () => {
    const report = buildBalancesOverview({ totalEquity: 10, accounts: [] }, undefined, [
      { source: "funding-balance", message: "boom" },
    ])
    expect(report.totalEquity).toBe(10)
    expect(report.failures).toEqual([{ source: "funding-balance", message: "boom" }])
  })

  it("throws an AuthError naming the Assets permission when both sources fail with auth", () => {
    expect(() =>
      buildBalancesOverview(undefined, undefined, [
        { source: "asset-overview", message: "denied", error: new AuthError("denied", "bybit") },
        { source: "funding-balance", message: "denied", error: new AuthError("denied", "bybit") },
      ]),
    ).toThrow(/Assets|Wallet/)
  })
})
