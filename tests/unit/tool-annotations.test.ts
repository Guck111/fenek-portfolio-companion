import { describe, it, expect, beforeEach, afterEach } from "vitest"

import type { ToolBinding } from "../../src/brokers/base.js"
import { BybitBroker } from "../../src/brokers/bybit/index.js"
import { createBybitTools } from "../../src/brokers/bybit/tools.js"
import { CryptoBroker } from "../../src/brokers/crypto/index.js"
import { createCryptoTools } from "../../src/brokers/crypto/tools.js"
import { clear, listTools, register, registerTools } from "../../src/brokers/registry.js"
import { Trading212Broker } from "../../src/brokers/trading212/index.js"
import { createTrading212Tools } from "../../src/brokers/trading212/tools.js"
import { createAnalyticsTools } from "../../src/tools/analytics/index.js"
import { createPlaybookTools } from "../../src/tools/playbooks/index.js"

// Constructing a broker only builds its tool definitions — no network, no auth —
// so this exercises the real, complete tool inventory the directory will review.
function registerEveryRealTool(): void {
  const t212 = new Trading212Broker()
  register(t212, createTrading212Tools(t212))
  const crypto = new CryptoBroker()
  register(crypto, createCryptoTools(crypto))
  const bybit = new BybitBroker()
  register(bybit, createBybitTools(bybit))
  registerTools(createAnalyticsTools())
  registerTools(createPlaybookTools("en"))
}

function bindingWithTool(tool: ToolBinding["tool"]): ToolBinding {
  return { tool, handler: () => Promise.resolve({ content: [] }) }
}

describe("MCP Directory tool annotations", () => {
  beforeEach(() => {
    clear()
  })
  afterEach(() => {
    clear()
  })

  it("gives every registered tool a human-readable title and readOnlyHint:true", () => {
    registerEveryRealTool()

    const tools = listTools()
    // Guard against a vacuously-true loop: the full inventory is sizable.
    expect(tools.length).toBeGreaterThanOrEqual(20)

    for (const tool of tools) {
      const title = tool.annotations?.title
      expect(typeof title === "string" && title.length > 0, `${tool.name} has no title`).toBe(true)
      expect(tool.annotations?.readOnlyHint, `${tool.name} is not marked read-only`).toBe(true)
    }
  })

  it("stamps readOnlyHint:true on a tool that declares no annotations at all", () => {
    registerTools([
      bindingWithTool({
        name: "annotationless_tool",
        description: "x",
        inputSchema: { type: "object", properties: {} },
      }),
    ])

    const tool = listTools().find((t) => t.name === "annotationless_tool")
    expect(tool?.annotations?.readOnlyHint).toBe(true)
  })

  it("preserves a tool's declared title while adding readOnlyHint", () => {
    registerTools([
      bindingWithTool({
        name: "titled_tool",
        description: "x",
        inputSchema: { type: "object", properties: {} },
        annotations: { title: "Human Readable Title" },
      }),
    ])

    const tool = listTools().find((t) => t.name === "titled_tool")
    expect(tool?.annotations?.title).toBe("Human Readable Title")
    expect(tool?.annotations?.readOnlyHint).toBe(true)
  })

  it("forces readOnlyHint:true even when a binding declares it false (read-only invariant)", () => {
    registerTools([
      bindingWithTool({
        name: "mislabeled_tool",
        description: "x",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: false },
      }),
    ])

    const tool = listTools().find((t) => t.name === "mislabeled_tool")
    expect(tool?.annotations?.readOnlyHint).toBe(true)
  })
})
