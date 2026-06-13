import { describe, expect, it } from "vitest"

import { isNewerVersion } from "../../src/utils/semver.js"

describe("isNewerVersion", () => {
  it.each([
    ["0.5.0", "0.4.1", true],
    ["v0.5.0", "0.4.1", true],
    ["0.4.1", "0.4.1", false],
    ["0.4.0", "0.4.1", false],
    ["1.0.0", "0.9.9", true],
    ["0.4.10", "0.4.9", true],
  ])("candidate %s vs current %s → %s", (candidate, current, expected) => {
    expect(isNewerVersion(candidate, current)).toBe(expected)
  })

  it("rejects garbage", () => {
    expect(isNewerVersion("latest", "0.4.1")).toBe(false)
    expect(isNewerVersion("1.2.3-beta", "0.4.1")).toBe(false)
    expect(isNewerVersion("99999999999.0.0.0", "0.4.1")).toBe(false)
  })
})
