import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clear, register } from "../../src/brokers/registry.js"
import { Trading212Broker } from "../../src/brokers/trading212/index.js"
import { createTrading212Tools } from "../../src/brokers/trading212/tools.js"
import { _resetLicensingForTests } from "../../src/license/manager.js"
import {
  connectE2EClient,
  installFetchRouter,
  loadFixture,
  useHermeticStateDir,
} from "../helpers/e2e.js"
import { parseToolResult } from "../helpers/fake-broker.js"

// End-to-end across the real MCP boundary: a configured Trading 212 broker is
// registered, the server is driven through an in-process MCP client, and the
// broker's HTTP is stubbed at global fetch. Asserts the normalized JSON Claude
// actually receives — not internal mapper state.
describe("e2e: Trading 212 over the MCP tool boundary", () => {
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

  async function registerT212(): Promise<void> {
    const broker = new Trading212Broker()
    await broker.authenticate({
      credentials: { T212_API_KEY: "test-key", T212_API_SECRET: "test-secret" },
    })
    register(broker, createTrading212Tools(broker))
  }

  it("returns normalized positions for t212_get_positions", async () => {
    installFetchRouter([{ when: "/equity/positions", json: loadFixture("t212/positions.json") }])
    await registerT212()
    const harness = await connectE2EClient()
    try {
      const res = (await harness.client.callTool({
        name: "t212_get_positions",
        arguments: {},
      })) as CallToolResult
      expect(res.isError).toBeFalsy()
      expect(parseToolResult(res)).toEqual([
        {
          brokerId: "t212",
          ticker: "DEMOA_EQ",
          instrumentId: "DEMOA_EQ",
          name: "Demo Alpha",
          currency: "GBX",
          quantity: 10,
          averagePrice: { amount: 1000, currency: "GBX" },
          currentPrice: { amount: 1100, currency: "GBX" },
          marketValue: { amount: 110, currency: "EUR" },
          unrealizedPnL: { amount: 10, currency: "EUR" },
        },
        {
          brokerId: "t212",
          ticker: "DEMOB_EQ",
          instrumentId: "DEMOB_EQ",
          name: "Demo Beta",
          currency: "GBX",
          quantity: 5,
          averagePrice: { amount: 2100, currency: "GBX" },
          currentPrice: { amount: 2000, currency: "GBX" },
          marketValue: { amount: 95, currency: "EUR" },
          unrealizedPnL: { amount: -5, currency: "EUR" },
        },
      ])
    } finally {
      await harness.close()
    }
  })

  it("maps a 401 into a directive missing-scope error through the boundary", async () => {
    installFetchRouter([{ when: "/equity/positions", status: 401, json: {} }])
    await registerT212()
    const harness = await connectE2EClient()
    try {
      const res = (await harness.client.callTool({
        name: "t212_get_positions",
        arguments: {},
      })) as CallToolResult
      expect(res.isError).toBe(true)
      const first = res.content[0]
      const text = first?.type === "text" ? first.text : ""
      expect(text).toContain("Trading 212 rejected the request")
      expect(text).toContain("Account data, Portfolio")
    } finally {
      await harness.close()
    }
  })
})
