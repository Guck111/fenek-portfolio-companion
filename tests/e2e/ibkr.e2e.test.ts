import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clear, register } from "../../src/brokers/registry.js"
import { IbkrBroker } from "../../src/brokers/ibkr/index.js"
import { createIbkrTools } from "../../src/brokers/ibkr/tools.js"
import { _resetLicensingForTests } from "../../src/license/manager.js"
import {
  connectE2EClient,
  installFetchRouter,
  loadFixtureText,
  useHermeticStateDir,
} from "../helpers/e2e.js"
import { parseToolResult } from "../helpers/fake-broker.js"

// SendRequest-Success envelope for step 1 of the two-step Flex Web Service flow.
// parseSendRequestEnvelope reads <Status>/<ReferenceCode>/<Url> child text
// (case-insensitive); the <Url> drives step 2, so it contains "GetStatement" to
// match the statement route below. Because the statement route returns the final
// FlexQueryResponse immediately, the client never enters its poll-and-sleep loop.
const SEND_REQUEST_SUCCESS = `<?xml version="1.0" encoding="UTF-8"?>
<FlexStatementResponse timestamp="01 February, 2024 12:00 PM EST">
  <Status>Success</Status>
  <ReferenceCode>1234567890</ReferenceCode>
  <Url>https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.GetStatement</Url>
</FlexStatementResponse>`

// End-to-end across the real MCP boundary: a configured Interactive Brokers (Flex)
// broker is registered, the server is driven through an in-process MCP client, and
// the two-step Flex HTTP (SendRequest → GetStatement) is stubbed at global fetch.
// Asserts the normalized JSON Claude actually receives — not internal parser state.
describe("e2e: Interactive Brokers (Flex) over the MCP tool boundary", () => {
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

  async function registerIbkr(): Promise<void> {
    const broker = new IbkrBroker()
    await broker.authenticate({
      credentials: { IBKR_FLEX_TOKEN: "test-token", IBKR_FLEX_QUERY_ID: "test-query" },
    })
    register(broker, createIbkrTools(broker))
  }

  it("returns normalized positions for ibkr_get_positions via the two-step Flex flow", async () => {
    installFetchRouter([
      { when: "SendRequest", text: SEND_REQUEST_SUCCESS },
      { when: "GetStatement", text: loadFixtureText("ibkr/activity-flex.xml") },
    ])
    await registerIbkr()
    const harness = await connectE2EClient()
    try {
      const res = (await harness.client.callTool({
        name: "ibkr_get_positions",
        arguments: {},
      })) as CallToolResult
      expect(res.isError).toBeFalsy()
      const payload = parseToolResult(res) as { accountId: string; positions: unknown }
      expect(payload.accountId).toBe("U0000000")
      expect(payload.positions).toEqual([
        {
          brokerId: "ibkr",
          ticker: "AAPL",
          instrumentId: "265598",
          name: "Apple Inc.",
          currency: "USD",
          quantity: 100,
          averagePrice: { amount: 150.25, currency: "USD" },
          currentPrice: { amount: 190.5, currency: "USD" },
          marketValue: { amount: 19050, currency: "USD" },
          unrealizedPnL: { amount: 4025, currency: "USD" },
        },
        {
          brokerId: "ibkr",
          ticker: "PG",
          instrumentId: "4194",
          name: "Procter & Gamble Co.",
          currency: "USD",
          quantity: -10,
          averagePrice: { amount: 155, currency: "USD" },
          currentPrice: { amount: 160, currency: "USD" },
          marketValue: { amount: -1600, currency: "USD" },
          unrealizedPnL: { amount: -50, currency: "USD" },
        },
      ])
    } finally {
      await harness.close()
    }
  })

  it("maps a 401 on SendRequest into a directive auth error through the boundary", async () => {
    installFetchRouter([{ when: "SendRequest", status: 401, text: "" }])
    await registerIbkr()
    const harness = await connectE2EClient()
    try {
      const res = (await harness.client.callTool({
        name: "ibkr_get_positions",
        arguments: {},
      })) as CallToolResult
      expect(res.isError).toBe(true)
      const first = res.content[0]
      const text = first?.type === "text" ? first.text : ""
      // Lock down the directive content, not just the broker name (which
      // prefixes every error class) — this must be the missing-scope guidance.
      expect(text).toContain("rejected the request")
      expect(text).toContain("Flex Query")
    } finally {
      await harness.close()
    }
  })
})
