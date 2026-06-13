import { describe, expect, it } from "vitest"

import { PAYWALL_ENABLED } from "../../src/license/config.js"
import {
  AGGREGATE_EXCLUDED_NOTE,
  PRO_INSTRUCTIONS_SENTENCE,
  PRO_TOOL_DESCRIPTION_SUFFIX,
  proDenialText,
} from "../../src/license/texts.js"

describe("license config and texts", () => {
  it("ships with the paywall ON (purchase channel is live: fenek.tech + Polar)", () => {
    expect(PAYWALL_ENABLED).toBe(true)
  })

  it("denial texts distinguish the three states and never promise a price", () => {
    const noKey = proDenialText("no-key")
    const revoked = proDenialText("revoked")
    const unreachable = proDenialText("unreachable")
    expect(noKey).toContain("fenek.tech")
    expect(noKey).toContain("freepro")
    expect(revoked).toContain("Renew")
    expect(unreachable).toContain("grace")
    expect(unreachable).toContain("not a billing decision")
    // "revoked" and "unreachable" must never read the same
    expect(revoked).not.toBe(unreachable)
    for (const text of [noKey, revoked, unreachable]) {
      expect(text).toContain("keep working")
      expect(text).not.toMatch(/\$|\bUSD\b|price/i)
    }
  })

  it("tool suffix and aggregate note point at fenek.tech", () => {
    expect(PRO_TOOL_DESCRIPTION_SUFFIX).toContain("fenek.tech")
    expect(PRO_TOOL_DESCRIPTION_SUFFIX).toContain("Fenek Pro")
    expect(AGGREGATE_EXCLUDED_NOTE).toContain("Fenek Pro")
    expect(PRO_INSTRUCTIONS_SENTENCE).toContain("do not retry")
  })
})
