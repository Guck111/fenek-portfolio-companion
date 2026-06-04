import type { PromptBinding } from "../brokers/base.js"
import { getMessages, type Locale } from "../i18n/index.js"

export function createAnalyzeOverviewPrompt(locale: Locale): PromptBinding {
  const m = getMessages(locale).analyze_overview
  return {
    prompt: {
      name: "analyze_overview",
      description: m.description,
    },
    handler: () =>
      Promise.resolve({
        description: m.description,
        messages: [{ role: "user", content: { type: "text", text: m.text } }],
      }),
  }
}
