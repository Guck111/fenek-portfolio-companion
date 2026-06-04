import type { PromptBinding } from "../brokers/base.js"
import { getMessages } from "../i18n/index.js"

export function createAnalyzeOverviewPrompt(): PromptBinding {
  const m = getMessages().analyze_overview
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
