import { z } from "zod"

import type { ToolBinding } from "../../brokers/base.js"
import { getMessages, type Locale } from "../../i18n/index.js"
import { parseArgs } from "../result.js"

const Args = z
  .object({
    year: z
      .string()
      .regex(/^\d{4}$/, "must be a 4-digit year")
      .optional(),
  })
  .strict()

export function createReviewDividendsPlaybook(locale: Locale): ToolBinding {
  const m = getMessages(locale).review_dividends
  return {
    tool: {
      name: "review_dividends",
      annotations: { title: "Playbook: Review Dividends" },
      description: `${m.description} (Tool form of the review_dividends prompt — clients that don't surface MCP prompts in their UI can still invoke this as a tool.)`,
      inputSchema: {
        type: "object",
        properties: {
          year: { type: "string", description: m.year_arg_description },
        },
        additionalProperties: false,
      },
    },
    handler: (args) => {
      const r = parseArgs(Args, args)
      if (!r.ok) return Promise.resolve(r.result)
      const text =
        r.data.year !== undefined && r.data.year.length > 0
          ? m.text_with_year(r.data.year)
          : m.text_no_year
      return Promise.resolve({ content: [{ type: "text", text }] })
    },
  }
}
