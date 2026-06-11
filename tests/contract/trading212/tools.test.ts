import { describe, it, expect } from "vitest"

import { Trading212Broker } from "../../../src/brokers/trading212/index.js"
import { createTrading212Tools } from "../../../src/brokers/trading212/tools.js"

describe("trading212 tools", () => {
  it("exposes the exchange working-hours tool", () => {
    const names = createTrading212Tools(new Trading212Broker()).map((t) => t.tool.name)
    expect(names).toContain("t212_get_exchanges")
  })

  it("rejects unexpected arguments on t212_get_exchanges", async () => {
    const binding = createTrading212Tools(new Trading212Broker()).find(
      (t) => t.tool.name === "t212_get_exchanges",
    )
    expect(binding).toBeDefined()
    if (binding === undefined) return
    const res = await binding.handler({ unexpected: true })
    expect(res.isError).toBe(true)
  })
})
