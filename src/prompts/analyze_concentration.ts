import type { PromptBinding } from "../brokers/base.js"
import { getMessages } from "../i18n/index.js"

export function createAnalyzeConcentrationPrompt(): PromptBinding {
  const m = getMessages().analyze_concentration
  return {
    prompt: {
      name: "analyze_concentration",
      description: m.description,
    },
    handler: () =>
      Promise.resolve({
        description: m.description,
        messages: [{ role: "user", content: { type: "text", text: m.text } }],
      }),
  }
}
