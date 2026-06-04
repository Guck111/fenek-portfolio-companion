import type { PromptBinding } from "../brokers/base.js"
import { getMessages } from "../i18n/index.js"

const YEAR_RE = /^\d{4}$/

export function createReviewDividendsPrompt(): PromptBinding {
  const m = getMessages().review_dividends
  return {
    prompt: {
      name: "review_dividends",
      description: m.description,
      arguments: [
        {
          name: "year",
          description: m.year_arg_description,
          required: false,
        },
      ],
    },
    handler: (args) => {
      const year = args?.["year"]
      if (year !== undefined && year.length > 0 && !YEAR_RE.test(year)) {
        return Promise.reject(new Error("year argument must be a 4-digit year (e.g. 2025)"))
      }
      const text = year !== undefined && year.length > 0 ? m.text_with_year(year) : m.text_no_year
      return Promise.resolve({
        description: m.description,
        messages: [{ role: "user", content: { type: "text", text } }],
      })
    },
  }
}
