import { beforeEach, describe, expect, it } from "vitest"

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

import { callTool, clear, listTools, registerTools } from "../../src/brokers/registry.js"
import { createGettingStartedTool } from "../../src/tools/getting_started.js"

function firstText(result: CallToolResult): string {
  const block = result.content[0]
  if (block?.type !== "text") throw new Error("expected text content")
  return block.text
}

describe("fenek_getting_started tool", () => {
  beforeEach(() => {
    clear()
    registerTools([createGettingStartedTool()])
  })

  it("is listed with a human-readable title and read-only hint", () => {
    const tool = listTools().find((t) => t.name === "fenek_getting_started")
    expect(tool).toBeDefined()
    expect(tool?.annotations?.readOnlyHint).toBe(true)
    const title = tool?.annotations?.title
    expect(typeof title === "string" && title.length > 0).toBe(true)
  })

  it("returns a briefing naming every source and the read-only posture", async () => {
    const result = await callTool("fenek_getting_started", {})
    const text = firstText(result)
    expect(result.isError ?? false).toBe(false)
    expect(text).toMatch(/read-only/i)
    expect(text).toMatch(/Trading 212/i)
    expect(text).toMatch(/Interactive Brokers/i)
    expect(text).toMatch(/Solana/i)
    expect(text).toMatch(/\bTON\b/)
    expect(text).toMatch(/Bybit/i)
  })
})
