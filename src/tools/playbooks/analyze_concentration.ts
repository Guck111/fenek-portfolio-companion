import type { ToolBinding } from "../../brokers/base.js"
import { getMessages, type Locale } from "../../i18n/index.js"

export function createAnalyzeConcentrationPlaybook(locale: Locale): ToolBinding {
  const m = getMessages(locale).analyze_concentration
  return {
    tool: {
      name: "analyze_concentration",
      annotations: { title: "Playbook: Concentration Review" },
      description: `${m.description} (Tool form of the analyze_concentration prompt — clients that don't surface MCP prompts in their UI can still invoke this as a tool.)`,
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    handler: () => Promise.resolve({ content: [{ type: "text", text: m.text }] }),
  }
}
