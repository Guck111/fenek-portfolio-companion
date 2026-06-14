import { describe, it, expect, vi } from "vitest"

import { createIbkrTools } from "../../../src/brokers/ibkr/tools.js"
import { IbkrBroker } from "../../../src/brokers/ibkr/index.js"

function textOf(result: { content: readonly { type: string; text?: string }[] }): string {
  const first = result.content[0]
  if (first?.type !== "text" || first.text === undefined) throw new Error("expected text content")
  return first.text
}

describe("ibkr tools", () => {
  it("exposes the five IBKR tools", () => {
    const tools = createIbkrTools(new IbkrBroker())
    expect(tools.map((t) => t.tool.name).sort()).toEqual([
      "ibkr_get_account",
      "ibkr_get_dividends",
      "ibkr_get_positions",
      "ibkr_get_trades",
      "ibkr_get_transactions",
    ])
  })

  it("marks all tools as free (no Pro tier)", () => {
    const tools = createIbkrTools(new IbkrBroker())
    expect(tools.every((t) => t.tier === undefined)).toBe(true)
  })

  it("rejects unexpected arguments", async () => {
    const tools = createIbkrTools(new IbkrBroker())
    const binding = tools[0]
    if (binding === undefined) throw new Error("no tool")
    const res = await binding.handler({ unexpected: true })
    expect(res.isError).toBe(true)
  })

  it("wraps positions with a freshness envelope (asOf + period + accountId)", async () => {
    const broker = new IbkrBroker()
    vi.spyOn(broker, "getStatementMeta").mockResolvedValue({
      accountId: "U0000000",
      fromDate: "20240101",
      toDate: "20240131",
      whenGenerated: "20240201;120000",
    })
    vi.spyOn(broker, "getPositions").mockResolvedValue([
      {
        brokerId: "ibkr",
        ticker: "AAPL",
        currency: "USD",
        quantity: 100,
        currentPrice: { amount: 190.5, currency: "USD" },
        marketValue: { amount: 19050, currency: "USD" },
      },
    ])

    const tools = createIbkrTools(broker)
    const positionsTool = tools.find((t) => t.tool.name === "ibkr_get_positions")
    if (positionsTool === undefined) throw new Error("no positions tool")
    const res = await positionsTool.handler({})

    expect(res.isError).toBeFalsy()
    const payload = JSON.parse(textOf(res)) as {
      asOf: string
      accountId: string
      positions: { ticker: string }[]
    }
    expect(payload.asOf).toBe("20240201;120000")
    expect(payload.accountId).toBe("U0000000")
    expect(payload.positions[0]?.ticker).toBe("AAPL")
  })
})
