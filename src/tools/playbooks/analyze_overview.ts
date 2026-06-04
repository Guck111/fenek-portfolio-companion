import type { ToolBinding } from "../../brokers/base.js"
import { getMessages, type Locale } from "../../i18n/index.js"

export function createAnalyzeOverviewPlaybook(locale: Locale): ToolBinding {
  const m = getMessages(locale).analyze_overview
  return {
    tool: {
      name: "analyze_overview",
      description: `${m.description} (Tool form of the analyze_overview prompt — clients that don't surface MCP prompts in their UI can still invoke this as a tool.)`,
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    handler: () => Promise.resolve({ content: [{ type: "text", text: m.text }] }),
  }
}
