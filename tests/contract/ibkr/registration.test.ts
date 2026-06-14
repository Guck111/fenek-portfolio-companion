import { describe, it, expect, afterEach } from "vitest"

import { IbkrBroker } from "../../../src/brokers/ibkr/index.js"
import { createIbkrTools } from "../../../src/brokers/ibkr/tools.js"
import { clear, list, listTools, register } from "../../../src/brokers/registry.js"

afterEach(() => {
  clear()
})

describe("ibkr registration", () => {
  it("registers the broker and lists its five tools as free (no Pro suffix)", () => {
    const broker = new IbkrBroker()
    register(broker, createIbkrTools(broker))

    expect(list().map((b) => b.id)).toContain("ibkr")

    const tools = listTools()
    const names = tools.map((t) => t.name)
    for (const name of [
      "ibkr_get_account",
      "ibkr_get_positions",
      "ibkr_get_transactions",
      "ibkr_get_dividends",
      "ibkr_get_trades",
    ]) {
      expect(names).toContain(name)
    }
    // free tier → descriptions are not annotated with the Pro upsell suffix
    const positions = tools.find((t) => t.name === "ibkr_get_positions")
    expect(positions?.description).not.toMatch(/Pro/)
  })
})
