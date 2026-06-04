import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import { JupiterTriggerOrdersResponse } from "../../../src/brokers/crypto/schemas.js"
import { mapJupiterOrders } from "../../../src/brokers/crypto/jupiter.js"

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/crypto",
)

function readFixture(rel: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, rel), "utf8"))
}

describe("jupiter schemas", () => {
  it("parses getTriggerOrders response", () => {
    expect(
      JupiterTriggerOrdersResponse.safeParse(readFixture("jupiter/trigger_orders.json")).success,
    ).toBe(true)
  })
})

describe("mapJupiterOrders", () => {
  const SOL = "So11111111111111111111111111111111111111112"
  const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

  it("maps a swap limit order to OpenOrder using resolved symbols", () => {
    const parsed = JupiterTriggerOrdersResponse.parse(readFixture("jupiter/trigger_orders.json"))
    const symbols = new Map([
      [SOL, "SOL"],
      [USDC, "USDC"],
    ])
    const orders = mapJupiterOrders(parsed.orders, symbols)
    expect(orders).toHaveLength(1)
    const o = orders[0]
    expect(o?.brokerId).toBe("crypto")
    expect(o?.orderId).toBe("DemoTriggerKey1111111111111111111111111111111")
    expect(o?.symbol).toBe("SOL/USDC")
    expect(o?.side).toBe("sell")
    expect(o?.orderType).toBe("Limit")
    expect(o?.price).toBe(200)
    expect(o?.quantity).toBe(10)
    expect(o?.filledQuantity).toBe(0)
    expect(o?.status).toBe("Open")
    expect(o?.category).toBe("jupiter")
    expect(o?.createdAt).toBe("2026-05-01T12:00:00Z")
  })

  it("falls back to the raw mint in the symbol when a symbol is unresolved", () => {
    const parsed = JupiterTriggerOrdersResponse.parse(readFixture("jupiter/trigger_orders.json"))
    const orders = mapJupiterOrders(parsed.orders, new Map([[SOL, "SOL"]]))
    expect(orders[0]?.symbol).toBe(`SOL/${USDC}`)
  })
})
