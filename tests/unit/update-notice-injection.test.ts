import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { appendUpdateNotice } from "../../src/brokers/registry.js"
import { BUILD_DATE } from "../../src/generated/build-info.js"
import { writeStateFile } from "../../src/utils/app-state.js"
import { _resetForTests } from "../../src/utils/update-check.js"

const ok = (): CallToolResult => ({ content: [{ type: "text", text: "data" }] })

function joinText(result: CallToolResult): string {
  return result.content.map((c) => (c.type === "text" ? c.text : "")).join("\n")
}

describe("update notice injection", () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "fenek-noti-"))
    process.env["FENEK_STATE_DIR"] = dir
    // Anchor "now" to the build date so the age-based tier never fires here;
    // these tests isolate the version-based notice.
    vi.useFakeTimers({ now: new Date(`${BUILD_DATE}T12:00:00.000Z`) })
    _resetForTests()
  })
  afterEach(() => {
    vi.useRealTimers()
    delete process.env["FENEK_STATE_DIR"]
    rmSync(dir, { recursive: true, force: true })
  })

  it("appends the notice when a newer version is known", () => {
    writeStateFile("update-state.json", { latestKnownVersion: "99.0.0" })
    expect(joinText(appendUpdateNotice(ok()))).toContain("99.0.0")
  })

  it("leaves a clean result untouched when nothing is due", () => {
    expect(appendUpdateNotice(ok()).content).toHaveLength(1)
  })

  it("never touches an error result", () => {
    writeStateFile("update-state.json", { latestKnownVersion: "99.0.0" })
    const err: CallToolResult = { isError: true, content: [{ type: "text", text: "boom" }] }
    expect(appendUpdateNotice(err).content).toHaveLength(1)
  })
})
