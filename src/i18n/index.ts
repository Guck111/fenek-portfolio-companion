import { en } from "./en.js"
import { ru } from "./ru.js"
import type { Locale, PromptMessages } from "./types.js"

const messages: Readonly<Record<Locale, PromptMessages>> = { en, ru }

export function getMessages(locale: Locale): PromptMessages {
  return messages[locale]
}

export function parseLocale(raw: string | undefined): Locale {
  const lower = (raw ?? "en").trim().toLowerCase()
  if (lower === "ru" || lower.startsWith("ru-") || lower.startsWith("ru_")) return "ru"
  return "en"
}

export type { Locale, PromptMessages }
export { ALL_LOCALES } from "./types.js"
