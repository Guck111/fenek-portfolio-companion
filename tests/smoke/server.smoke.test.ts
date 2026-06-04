import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const entryPoint = path.resolve(here, "../../src/index.ts")

describe("server smoke", () => {
  it("lists 4 cross-broker tools and 5 core prompts when no broker is configured", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", entryPoint],
    })
    const client = new Client({ name: "smoke-client", version: "0.0.1" }, { capabilities: {} })

    await client.connect(transport)
    try {
      const tools = await client.listTools()
      const toolNames = tools.tools.map((t) => t.name).sort()
      expect(toolNames).toEqual([
        "analyze_concentration",
        "analyze_overview",
        "portfolio_concentration",
        "portfolio_dividend_history",
        "portfolio_overview",
        "portfolio_pie_overlap",
        "review_dividends",
        "review_pie",
      ])

      const prompts = await client.listPrompts()
      const promptNames = prompts.prompts.map((p) => p.name).sort()
      expect(promptNames).toEqual([
        "analyze_concentration",
        "analyze_overview",
        "fenek_getting_started",
        "review_dividends",
        "review_pie",
      ])

      const instructions = client.getInstructions()
      expect(instructions).toBeDefined()
      expect(instructions).toMatch(/read-only/i)
      expect(instructions).toMatch(/data, not advice/i)
      expect(instructions).toMatch(/do not recommend/i)
      expect(instructions).toMatch(/401 or 403/)
    } finally {
      await client.close()
    }
  }, 15_000)
})
