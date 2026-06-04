import type { ToolBinding } from "../../brokers/base.js"
import { getMessages } from "../../i18n/index.js"

export function createAnalyzeOverviewPlaybook(): ToolBinding {
  const m = getMessages().analyze_overview
  return {
    tool: {
      name: "analyze_overview",
      annotations: { title: "Playbook: Portfolio Overview" },
      description: `${m.description} (Tool form of the analyze_overview prompt — clients that don't surface MCP prompts in their UI can still invoke this as a tool.)`,
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    handler: () => Promise.resolve({ content: [{ type: "text", text: m.text }] }),
  }
}
