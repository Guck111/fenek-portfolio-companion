import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { keyFingerprint, readLicenseState, writeLicenseState } from "../../src/license/state.js"

describe("license state cache", () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "fenek-license-"))
    process.env["FENEK_STATE_DIR"] = dir
  })
  afterEach(() => {
    delete process.env["FENEK_STATE_DIR"]
    rmSync(dir, { recursive: true, force: true })
  })

  it("fingerprints keys as a short stable sha256 prefix", () => {
    const fp = keyFingerprint("super-secret-key")
    expect(fp).toMatch(/^[0-9a-f]{16}$/)
    expect(keyFingerprint("super-secret-key")).toBe(fp)
    expect(keyFingerprint("other-key")).not.toBe(fp)
  })

  it("round-trips a verdict", () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("k"),
      lastVerdict: "valid",
      checkedAt: "2026-06-12T00:00:00.000Z",
      validUntil: "2026-07-12T00:00:00.000Z",
    })
    const state = readLicenseState()
    expect(state?.lastVerdict).toBe("valid")
    expect(state?.validUntil).toBe("2026-07-12T00:00:00.000Z")
  })

  it("never persists the raw license key", () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("super-secret-key"),
      lastVerdict: "revoked",
      checkedAt: "2026-06-12T00:00:00.000Z",
    })
    const raw = readFileSync(join(dir, "license-state.json"), "utf8")
    expect(raw).not.toContain("super-secret-key")
    expect(raw).toContain(keyFingerprint("super-secret-key"))
    expect(readLicenseState()?.validUntil).toBeUndefined()
  })

  it("returns undefined when nothing was saved", () => {
    expect(readLicenseState()).toBeUndefined()
  })

  it("discards a cache with a corrupt timestamp", () => {
    writeFileSync(
      join(dir, "license-state.json"),
      JSON.stringify({
        keyFingerprint: keyFingerprint("k"),
        lastVerdict: "valid",
        checkedAt: "yesterday",
      }),
    )
    expect(readLicenseState()).toBeUndefined()
  })
})
