import type { PromptBinding } from "../brokers/base.js"
import { getMessages, type Locale } from "../i18n/index.js"

export function createReviewPiePrompt(locale: Locale): PromptBinding {
  const m = getMessages(locale).review_pie
  return {
    prompt: {
      name: "review_pie",
      description: m.description,
      arguments: [
        {
          name: "pie_id",
          description: m.pie_id_arg_description,
          required: true,
        },
      ],
    },
    handler: (args) => {
      const pieId = args?.["pie_id"]
      if (pieId === undefined || pieId.length === 0) {
        return Promise.reject(new Error("pie_id argument is required"))
      }
      return Promise.resolve({
        description: m.description,
        messages: [{ role: "user", content: { type: "text", text: m.text(pieId) } }],
      })
    },
  }
}
