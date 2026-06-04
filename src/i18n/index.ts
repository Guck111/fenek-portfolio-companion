import { en } from "./en.js"
import type { PromptMessages } from "./types.js"

export function getMessages(): PromptMessages {
  return en
}

export type { PromptMessages }
