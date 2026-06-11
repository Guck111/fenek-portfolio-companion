import { describe, it, expect } from "vitest"

import {
  buildEarnReport,
  mapDualAssetPositions,
  mapEarnPositions,
  mapFixedTermPositions,
  mapTokenPosition,
} from "../../../src/brokers/bybit/index.js"
import {
  BybitDualAssetPositionResult,
  BybitEarnPositionResult,
  BybitFixedTermPositionResult,
  BybitTokenPositionResult,
} from "../../../src/brokers/bybit/schemas.js"
import { AuthError, BrokerApiError } from "../../../src/utils/errors.js"

describe("bybit earn mappers", () => {
  it("maps flexible-saving positions and drops fully-redeemed (zero amount) rows", () => {
    const result = BybitEarnPositionResult.parse({
      list: [
        {
          coin: "USDT",
          productId: "430",
          amount: "1500.5",
          totalPnl: "",
          claimableYield: "0.42",
          status: "Active",
          autoReinvest: "Enable",
        },
        { coin: "BTC", productId: "12", amount: "0", claimableYield: "0" },
      ],
    })
    const positions = mapEarnPositions(result, "flexible")
    expect(positions).toHaveLength(1)
    const usdt = positions[0]
    expect(usdt?.brokerId).toBe("bybit")
    expect(usdt?.family).toBe("flexible")
    expect(usdt?.coin).toBe("USDT")
    expect(usdt?.amount).toBe(1500.5)
    expect(usdt?.claimableYield).toBe(0.42)
    expect(usdt?.totalPnl).toBeUndefined()
    expect(usdt?.status).toBe("Active")
  })

  it("maps fixed-term positions with percent APY and expected return", () => {
    const result = BybitFixedTermPositionResult.parse({
      list: [
        {
          positionId: "p1",
          productId: "77",
          category: "FixedTermSaving",
          coin: "ETH",
          amount: "2",
          status: "Active",
          settlementTime: "1760000000000",
          interestCoinApyList: [{ coin: "ETH", apy: "5.50%", expectReturnEarning: "0.01" }],
        },
      ],
    })
    const positions = mapFixedTermPositions(result)
    expect(positions[0]?.family).toBe("fixed-term")
    expect(positions[0]?.apy).toBe(5.5)
    expect(positions[0]?.expectedReturn).toBe(0.01)
    expect(positions[0]?.settlementTime).toBe("1760000000000")
  })

  it("maps the flat BYUSDT token position with aprE8 normalized to percent", () => {
    const result = BybitTokenPositionResult.parse({
      totalAmount: "250",
      totalYield: "3.1",
      yesterdayYield: "0.05",
      aprE8: 5000000,
    })
    const positions = mapTokenPosition(result)
    expect(positions).toHaveLength(1)
    expect(positions[0]?.family).toBe("token")
    expect(positions[0]?.coin).toBe("BYUSDT")
    expect(positions[0]?.amount).toBe(250)
    expect(positions[0]?.totalPnl).toBe(3.1)
    expect(positions[0]?.apy).toBe(5)
  })

  it("returns no token position when nothing is held", () => {
    expect(mapTokenPosition(BybitTokenPositionResult.parse({ totalAmount: "0" }))).toHaveLength(0)
  })

  it("maps dual-asset positions with apyE8 and expected return", () => {
    const result = BybitDualAssetPositionResult.parse({
      list: [
        {
          positionId: "d1",
          productId: "900",
          investCoin: "USDC",
          amount: "1000",
          apyE8: "12000000",
          direction: "BuyLow",
          targetPrice: "50000",
          settlementTime: "1760000000000",
          status: "Active",
          expectReturnCoin: "USDC",
          expectReturnAmount: "1003.2",
        },
      ],
    })
    const positions = mapDualAssetPositions(result)
    expect(positions[0]?.family).toBe("dual-asset")
    expect(positions[0]?.coin).toBe("USDC")
    expect(positions[0]?.apy).toBe(12)
    expect(positions[0]?.expectedReturn).toBe(1003.2)
  })
})

describe("bybit buildEarnReport", () => {
  const pos = {
    brokerId: "bybit",
    family: "flexible" as const,
    coin: "USDT",
    amount: 1,
  }

  it("collects positions and per-family failures", () => {
    const report = buildEarnReport([
      { family: "flexible", positions: [pos] },
      { family: "onchain", error: new BrokerApiError("boom", "bybit") },
    ])
    expect(report.positions).toHaveLength(1)
    expect(report.failures).toEqual([{ family: "onchain", message: "boom" }])
  })

  it("throws AuthError naming the Earn permission when every family fails with auth", () => {
    const auth = new AuthError("denied", "bybit")
    expect(() =>
      buildEarnReport([
        { family: "flexible", error: auth },
        { family: "onchain", error: auth },
      ]),
    ).toThrow(/Earn/)
  })
})
