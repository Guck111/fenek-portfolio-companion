import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  _resetForTests,
  getUpdateNotice,
  readUpdateState,
  runUpdateCheckIfDue,
} from "../../src/utils/update-check.js"

const NOW = new Date("2026-08-20T12:00:00.000Z")

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

describe("update notices", () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "fenek-upd-"))
    process.env["FENEK_STATE_DIR"] = dir
    vi.useFakeTimers({ now: NOW })
    _resetForTests()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete process.env["FENEK_STATE_DIR"]
    rmSync(dir, { recursive: true, force: true })
  })

  it("reports a newer version once per process", () => {
    const state = { latestKnownVersion: "9.9.9" }
    const build = { buildVersion: "0.5.0", buildDate: "2026-08-01" }
    expect(getUpdateNotice(state, build)).toContain("9.9.9")
    expect(getUpdateNotice(state, build)).toBeNull()
  })

  it("falls back to an age-based notice without network data", () => {
    const notice = getUpdateNotice({}, { buildVersion: "0.5.0", buildDate: "2026-05-01" })
    expect(notice).toContain("fenek.tech")
  })

  it("stays silent for a fresh build with no newer version", () => {
    expect(getUpdateNotice({}, { buildVersion: "0.5.0", buildDate: "2026-08-01" })).toBeNull()
  })

  it("stays silent when the latest known version equals the build, even on an old build", () => {
    // The user is provably on the latest release, so the age-based nag must not fire.
    const notice = getUpdateNotice(
      { latestKnownVersion: "0.5.0" },
      { buildVersion: "0.5.0", buildDate: "2026-01-01" },
    )
    expect(notice).toBeNull()
  })

  it("stays silent if reminded within the last 3 days", () => {
    const state = { latestKnownVersion: "9.9.9", lastRemindedAt: "2026-08-19T00:00:00.000Z" }
    expect(getUpdateNotice(state, { buildVersion: "0.5.0", buildDate: "2026-08-01" })).toBeNull()
  })

  it("skips the network when CHECK_UPDATES=false", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    await runUpdateCheckIfDue({ checkUpdates: false, state: {} })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("respects the 7-day window", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    await runUpdateCheckIfDue({
      checkUpdates: true,
      state: { lastUpdateCheckAt: "2026-08-19T00:00:00.000Z" },
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("fetches when due and stores a valid newer tag", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ tag_name: "v0.6.0" }))),
    )
    await runUpdateCheckIfDue({ checkUpdates: true, state: {} })
    expect(readUpdateState().latestKnownVersion).toBe("0.6.0")
    expect(readUpdateState().lastUpdateCheckAt).toBe(NOW.toISOString())
  })

  it("ignores a garbage tag but still stamps the check time", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ tag_name: "nightly" }))),
    )
    await runUpdateCheckIfDue({ checkUpdates: true, state: {} })
    const st = readUpdateState()
    expect(st.latestKnownVersion).toBeUndefined()
    expect(st.lastUpdateCheckAt).toBe(NOW.toISOString())
  })

  it("a network error never throws and still stamps the check time", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("ECONNRESET"))),
    )
    await runUpdateCheckIfDue({ checkUpdates: true, state: {} })
    expect(readUpdateState().lastUpdateCheckAt).toBe(NOW.toISOString())
  })
})
