import type { ToolBinding } from "../brokers/base.js"
import { GETTING_STARTED_TEXT } from "../prompts/fenek_getting_started.js"

// Tool-form of the fenek_getting_started prompt, so clients that surface MCP
// tools but not prompts (e.g. agent runtimes) can still reach the onboarding
// overview. Registered unconditionally; needs no credentials.
export function createGettingStartedTool(): ToolBinding {
  return {
    tool: {
      name: "fenek_getting_started",
      annotations: { title: "Fenek: Getting Started" },
      description:
        "Explains what Fenek Portfolio Companion does, which sources it supports (Trading 212, Solana, TON, Bybit), and how to configure them. Needs no API keys — invoke it before anything is set up. Tool form of the fenek_getting_started prompt, for clients that don't surface MCP prompts.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    handler: () => Promise.resolve({ content: [{ type: "text", text: GETTING_STARTED_TEXT }] }),
  }
}
