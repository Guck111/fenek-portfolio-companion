import { z } from "zod"

import type { ToolBinding } from "../../brokers/base.js"
import { getMessages } from "../../i18n/index.js"
import { parseArgs } from "../result.js"

const Args = z.object({ pie_id: z.string().min(1) }).strict()

export function createReviewPiePlaybook(): ToolBinding {
  const m = getMessages().review_pie
  return {
    tool: {
      name: "review_pie",
      annotations: { title: "Playbook: Review a Pie", openWorldHint: false },
      description: `${m.description} (Tool form of the review_pie prompt — clients that don't surface MCP prompts in their UI can still invoke this as a tool.)`,
      inputSchema: {
        type: "object",
        properties: {
          pie_id: { type: "string", description: m.pie_id_arg_description },
        },
        required: ["pie_id"],
        additionalProperties: false,
      },
    },
    handler: (args) => {
      const r = parseArgs(Args, args)
      if (!r.ok) return Promise.resolve(r.result)
      return Promise.resolve({ content: [{ type: "text", text: m.text(r.data.pie_id) }] })
    },
  }
}
