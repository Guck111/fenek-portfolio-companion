import { createRequire } from "node:module"

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
  type ListPromptsResult,
  type ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js"

import { callTool, getPrompt, listPrompts, listTools } from "./brokers/registry.js"

const require = createRequire(import.meta.url)
const pkg = require("../package.json") as { version: string }

const SERVER_NAME = "fenek-portfolio-companion"
export const SERVER_VERSION = pkg.version

const SERVER_INSTRUCTIONS = `This server provides read-only access to the user's portfolio across brokers, exchanges, and crypto wallets (Trading 212, Bybit including derivatives/Earn/Funding, and keyless on-chain wallets). Tools fetch data from provider APIs; none place orders, modify positions, transfer funds, or change any state on the provider's side. Treat results as data, not advice.

When responding to the user:
- Surface findings, totals, patterns, and discrepancies. Let the user decide what to do.
- Do not recommend specific trades, rebalancing, or any action that requires the user to commit or move capital.
- Do not infer prices, valuations, or P&L beyond what the tools return — broker data is authoritative.
- If a tool returns 401 or 403, name the missing API-key scope so the user can fix it in their broker settings: for Trading 212 — Account data, Portfolio, Pies - Read, History, Metadata, Orders - Read; for Bybit — the read permission groups Unified Trading, Assets/Wallet (funding + balances overview), Earn (staked positions). bybit_get_key_info shows what the Bybit key can access.
- If multiple currencies appear in totals, do not silently sum them — they are reported per currency by design, FX conversion is intentionally out of scope.`

// Builds the configured low-level Server (tools/prompts handlers wired) WITHOUT
// connecting a transport. Transport-agnostic by design so a future remote
// transport can reuse this exact server. See docs/superpowers/specs/2026-06-04-go-to-market-sequencing-design.md.
// eslint-disable-next-line @typescript-eslint/no-deprecated -- intentional low-level Server: McpServer lacks per-handler wiring needed here
export function createConfiguredServer(): Server {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { tools: {}, prompts: {} },
      instructions: SERVER_INSTRUCTIONS,
    },
  )

  server.setRequestHandler(ListToolsRequestSchema, (): ListToolsResult => {
    return { tools: [...listTools()] }
  })

  server.setRequestHandler(CallToolRequestSchema, (request) => {
    return callTool(request.params.name, request.params.arguments)
  })

  server.setRequestHandler(ListPromptsRequestSchema, (): ListPromptsResult => {
    return { prompts: [...listPrompts()] }
  })

  server.setRequestHandler(GetPromptRequestSchema, (request) => {
    return getPrompt(request.params.name, request.params.arguments)
  })

  return server
}

export async function startServer(): Promise<void> {
  const server = createConfiguredServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
