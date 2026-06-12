import { describe, it, expect } from "vitest"

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

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

function tool(name: string) {
  const binding = createTrading212Tools(new Trading212Broker()).find((t) => t.tool.name === name)
  if (binding === undefined) throw new Error(`tool ${name} not found`)
  return binding
}

function resultText(result: CallToolResult): string {
  return result.content.map((c) => ("text" in c ? c.text : "")).join(" ")
}

// Free-form string inputs are length-capped at the schema boundary so an
// oversized value is rejected before it reaches the provider API.
describe("t212 tool input bounds", () => {
  it("rejects an oversized pagination cursor", async () => {
    const result = await tool("t212_get_transactions").handler({ cursor: "x".repeat(10_000) })
    expect(result.isError).toBe(true)
    expect(resultText(result)).toContain("Invalid arguments")
  })

  it("rejects an oversized search query", async () => {
    const result = await tool("t212_search_instrument").handler({ query: "q".repeat(10_000) })
    expect(result.isError).toBe(true)
    expect(resultText(result)).toContain("Invalid arguments")
  })

  it("rejects an oversized pie id", async () => {
    const result = await tool("t212_get_pie").handler({ id: "9".repeat(10_000) })
    expect(result.isError).toBe(true)
    expect(resultText(result)).toContain("Invalid arguments")
  })
})
