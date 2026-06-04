import { beforeEach, describe, expect, it } from "vitest"

import type { PromptMessage } from "@modelcontextprotocol/sdk/types.js"

import { clear, getPrompt, listPrompts, registerPrompts } from "../../src/brokers/registry.js"
import { ALL_LOCALES, parseLocale, type Locale } from "../../src/i18n/index.js"
import { createCorePrompts } from "../../src/prompts/index.js"

function userText(messages: readonly PromptMessage[]): string {
  const first = messages[0]
  if (first === undefined) throw new Error("no messages")
  if (first.role !== "user") throw new Error("expected user role")
  if (first.content.type !== "text") throw new Error("expected text content")
  return first.content.text
}

const DISCLAIMER_PHRASES: Readonly<Record<Locale, RegExp>> = {
  en: /not financial advice.*final decisions are mine/is,
  ru: /не финансовый совет.*[Фф]инальные решения за мной/is,
}

describe.each(ALL_LOCALES)("core prompts (%s)", (locale) => {
  beforeEach(() => {
    clear()
    registerPrompts(createCorePrompts(locale))
  })

  it("registers exactly the 4 named prompts", () => {
    const names = listPrompts()
      .map((p) => p.name)
      .sort()
    expect(names).toEqual([
      "analyze_concentration",
      "analyze_overview",
      "review_dividends",
      "review_pie",
    ])
  })

  it("each prompt's text includes the locale-specific disclaimer", async () => {
    for (const prompt of listPrompts()) {
      const args = prompt.name === "review_pie" ? { pie_id: "100001" } : undefined
      const result = await getPrompt(prompt.name, args)
      const text = userText(result.messages)
      expect(text).toMatch(DISCLAIMER_PHRASES[locale])
    }
  })

  it("review_pie interpolates pie_id into the message", async () => {
    const result = await getPrompt("review_pie", { pie_id: "775251" })
    const text = userText(result.messages)
    expect(text).toContain("775251")
    expect(text).toContain('id="775251"')
  })

  it("review_pie rejects when pie_id is missing", async () => {
    await expect(getPrompt("review_pie", undefined)).rejects.toThrow(/pie_id/)
    await expect(getPrompt("review_pie", { pie_id: "" })).rejects.toThrow(/pie_id/)
  })

  it("review_dividends interpolates year and uses date filters", async () => {
    const result = await getPrompt("review_dividends", { year: "2025" })
    const text = userText(result.messages)
    expect(text).toContain("2025-01-01")
    expect(text).toContain("2025-12-31")
  })

  it("review_dividends rejects malformed year", async () => {
    await expect(getPrompt("review_dividends", { year: "not-a-year" })).rejects.toThrow(/4-digit/)
  })
})

describe("parseLocale", () => {
  it("returns 'en' for undefined and unknown values", () => {
    expect(parseLocale(undefined)).toBe("en")
    expect(parseLocale("")).toBe("en")
    expect(parseLocale("fr")).toBe("en")
    expect(parseLocale("klingon")).toBe("en")
  })

  it("returns 'en' explicitly", () => {
    expect(parseLocale("en")).toBe("en")
    expect(parseLocale("EN")).toBe("en")
    expect(parseLocale("en-US")).toBe("en")
    expect(parseLocale("en-GB")).toBe("en")
  })

  it("returns 'ru' for ru variants", () => {
    expect(parseLocale("ru")).toBe("ru")
    expect(parseLocale("RU")).toBe("ru")
    expect(parseLocale("ru-RU")).toBe("ru")
    expect(parseLocale("ru_RU")).toBe("ru")
    expect(parseLocale("  ru  ")).toBe("ru")
  })
})

describe("locale isolation", () => {
  it("ru and en prompts produce different text", async () => {
    clear()
    registerPrompts(createCorePrompts("en"))
    const enResult = await getPrompt("analyze_overview", undefined)
    const enText = userText(enResult.messages)

    clear()
    registerPrompts(createCorePrompts("ru"))
    const ruResult = await getPrompt("analyze_overview", undefined)
    const ruText = userText(ruResult.messages)

    expect(enText).not.toBe(ruText)
    expect(enText).toMatch(/run a quick health check/i)
    expect(ruText).toMatch(/health-check/i)
  })
})
