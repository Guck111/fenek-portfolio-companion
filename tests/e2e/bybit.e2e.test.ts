import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BybitBroker } from "../../src/brokers/bybit/index.js"
import { clear, register } from "../../src/brokers/registry.js"
import { createBybitTools } from "../../src/brokers/bybit/tools.js"
import { _resetLicensingForTests } from "../../src/license/manager.js"
import {
  connectE2EClient,
  installFetchRouter,
  loadFixture,
  useHermeticStateDir,
} from "../helpers/e2e.js"
import { parseToolResult } from "../helpers/fake-broker.js"

// End-to-end across the real MCP boundary: a configured Bybit broker is
// registered, the server is driven through an in-process MCP client, and the
// broker's HTTP is stubbed at global fetch. Asserts the normalized JSON Claude
// actually receives — not internal mapper state. Bybit is a "pro"-tier broker,
// but _resetLicensingForTests() leaves an inert runtime (paywall off), so the
// Pro tools are allowed with no extra setup.
describe("e2e: Bybit over the MCP tool boundary", () => {
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

  async function registerBybit(): Promise<void> {
    const broker = new BybitBroker()
    await broker.authenticate({
      credentials: { BYBIT_API_KEY: "test-key", BYBIT_API_SECRET: "test-secret" },
    })
    register(broker, createBybitTools(broker))
  }

  it("returns normalized coin balances for bybit_get_positions", async () => {
    installFetchRouter([
      { when: "/v5/account/wallet-balance", json: loadFixture("bybit/wallet-balance.json") },
    ])
    await registerBybit()
    const harness = await connectE2EClient()
    try {
      const res = (await harness.client.callTool({
        name: "bybit_get_positions",
        arguments: {},
      })) as CallToolResult
      expect(res.isError).toBeFalsy()
      // BTC and USDT carry a positive USD valuation; SCAM has an empty usdValue
      // and is dropped by the mapper, so it never reaches the client.
      expect(parseToolResult(res)).toEqual([
        {
          brokerId: "bybit",
          ticker: "BTC",
          currency: "USD",
          quantity: 0.5,
          currentPrice: { amount: 60000, currency: "USD" },
          marketValue: { amount: 30000, currency: "USD" },
        },
        {
          brokerId: "bybit",
          ticker: "USDT",
          currency: "USD",
          quantity: 1000,
          currentPrice: { amount: 1, currency: "USD" },
          marketValue: { amount: 1000, currency: "USD" },
        },
      ])
    } finally {
      await harness.close()
    }
  })

  it("maps a 401 into a directive missing-permission error through the boundary", async () => {
    installFetchRouter([{ when: "/v5/account/wallet-balance", status: 401, json: {} }])
    await registerBybit()
    const harness = await connectE2EClient()
    try {
      const res = (await harness.client.callTool({
        name: "bybit_get_positions",
        arguments: {},
      })) as CallToolResult
      expect(res.isError).toBe(true)
      const first = res.content[0]
      const text = first?.type === "text" ? first.text : ""
      expect(text).toContain("Bybit rejected the request")
      expect(text).toContain("Unified Trading, Assets/Wallet, Earn")
    } finally {
      await harness.close()
    }
  })
})
