import { describe, it, expect } from "vitest"

import { createBybitTools } from "../../../src/brokers/bybit/tools.js"
import { BybitBroker } from "../../../src/brokers/bybit/index.js"

describe("bybit tools", () => {
  it("exposes the full bybit tool inventory", () => {
    const tools = createBybitTools(new BybitBroker())
    expect(tools.map((t) => t.tool.name).sort()).toEqual([
      "bybit_get_account",
      "bybit_get_derivative_positions",
      "bybit_get_key_info",
      "bybit_get_open_orders",
      "bybit_get_positions",
    ])
  })

  it("rejects unexpected arguments", async () => {
    const tools = createBybitTools(new BybitBroker())
    const binding = tools[0]
    expect(binding).toBeDefined()
    if (binding === undefined) return
    const res = await binding.handler({ unexpected: true })
    expect(res.isError).toBe(true)
  })
})
