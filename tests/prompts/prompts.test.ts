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

describe("core prompts", () => {
  beforeEach(() => {
    clear()
    registerPrompts(createCorePrompts())
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

  it("each prompt's text includes the disclaimer", async () => {
    for (const prompt of listPrompts()) {
      const args = prompt.name === "review_pie" ? { pie_id: "100001" } : undefined
      const result = await getPrompt(prompt.name, args)
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
})
