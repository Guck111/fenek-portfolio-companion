import { beforeEach, describe, expect, it } from "vitest"

import type { PromptMessage } from "@modelcontextprotocol/sdk/types.js"

import { clear, getPrompt, listPrompts, registerPrompts } from "../../src/brokers/registry.js"
import { createCorePrompts } from "../../src/prompts/index.js"

function userText(messages: readonly PromptMessage[]): string {
  const first = messages[0]
  if (first === undefined) throw new Error("no messages")
  if (first.role !== "user") throw new Error("expected user role")
  if (first.content.type !== "text") throw new Error("expected text content")
  return first.content.text
}

const DISCLAIMER = /not financial advice.*final decisions are mine/is
const ANALYSIS_PROMPTS = [
  "analyze_concentration",
  "analyze_overview",
  "review_dividends",
  "review_pie",
] as const

describe("core prompts", () => {
  beforeEach(() => {
    clear()
    registerPrompts(createCorePrompts())
  })

  it("registers the analysis prompts plus the onboarding prompt", () => {
    const names = listPrompts()
      .map((p) => p.name)
      .sort()
    expect(names).toEqual([
      "analyze_concentration",
      "analyze_overview",
      "fenek_getting_started",
      "review_dividends",
      "review_pie",
    ])
  })

  it("each analysis prompt's text includes the disclaimer", async () => {
    for (const name of ANALYSIS_PROMPTS) {
      const args = name === "review_pie" ? { pie_id: "100001" } : undefined
      const result = await getPrompt(name, args)
      const text = userText(result.messages)
      expect(text).toMatch(DISCLAIMER)
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

  it("fenek_getting_started needs no arguments", () => {
    const onboarding = listPrompts().find((p) => p.name === "fenek_getting_started")
    expect(onboarding?.arguments ?? []).toEqual([])
  })

  it("fenek_getting_started briefs read-only nature and every supported source", async () => {
    const result = await getPrompt("fenek_getting_started", undefined)
    const text = userText(result.messages)
    expect(text).toMatch(/read-only/i)
    expect(text).toMatch(/Trading 212/i)
    expect(text).toMatch(/Solana/i)
    expect(text).toMatch(/\bTON\b/)
    expect(text).toMatch(/Bybit/i)
    // It points the user at where to configure, before any keys are entered.
    expect(text).toMatch(/settings/i)
  })
})
