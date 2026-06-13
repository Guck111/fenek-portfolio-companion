import { mkdtempSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { LicenseProvider, LicenseVerdict } from "../../src/license/provider.js"
import {
  _resetLicensingForTests,
  ensureProAccess,
  getTier,
  initLicensing,
  isPaywallActive,
} from "../../src/license/manager.js"
import { keyFingerprint, writeLicenseState } from "../../src/license/state.js"

const NOW = new Date("2026-06-12T12:00:00.000Z")
const DAY = 24 * 60 * 60 * 1000

function fakeProvider(verdict: LicenseVerdict): LicenseProvider & { calls: number } {
  const p = {
    calls: 0,
    validate: (): Promise<LicenseVerdict> => {
      p.calls++
      return Promise.resolve(verdict)
    },
  }
  return p
}

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY).toISOString()
}

describe("license manager", () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "fenek-mgr-"))
    process.env["FENEK_STATE_DIR"] = dir
    vi.useFakeTimers({ now: NOW })
    _resetLicensingForTests()
  })
  afterEach(() => {
    vi.useRealTimers()
    delete process.env["FENEK_STATE_DIR"]
    rmSync(dir, { recursive: true, force: true })
    _resetLicensingForTests()
  })

  it("paywall off → pro for everyone, provider untouched, no state file", async () => {
    const provider = fakeProvider({ kind: "revoked" })
    initLicensing({ paywallEnabled: false, buildFlavor: "standard", licenseKey: "k", provider })
    expect(isPaywallActive()).toBe(false)
    expect(getTier()).toBe("pro")
    expect(await ensureProAccess()).toEqual({ allowed: true })
    expect(provider.calls).toBe(0)
    expect(readdirSync(dir)).toEqual([])
  })

  it("freepro flavor → pro even with the paywall enabled, zero network", async () => {
    const provider = fakeProvider({ kind: "revoked" })
    initLicensing({ paywallEnabled: true, buildFlavor: "freepro", licenseKey: undefined, provider })
    expect(isPaywallActive()).toBe(false)
    expect(getTier()).toBe("pro")
    expect(await ensureProAccess()).toEqual({ allowed: true })
    expect(provider.calls).toBe(0)
    expect(readdirSync(dir)).toEqual([])
  })

  it("paywall on, no key → free with no-key reason, provider untouched", async () => {
    const provider = fakeProvider({ kind: "valid" })
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: undefined,
      provider,
    })
    expect(getTier()).toBe("free")
    expect(await ensureProAccess()).toEqual({ allowed: false, reason: "no-key" })
    expect(provider.calls).toBe(0)
  })

  it("first run with a key: valid verdict grants pro and persists the cache", async () => {
    const provider = fakeProvider({ kind: "valid", validUntil: "2026-07-12T00:00:00.000Z" })
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    expect(getTier()).toBe("free") // nothing validated yet
    expect(await ensureProAccess()).toEqual({ allowed: true })
    expect(provider.calls).toBe(1)
    expect(getTier()).toBe("pro")
    expect(readdirSync(dir)).toContain("license-state.json")
  })

  it("first run, server unreachable → denied as unreachable (no cached token to be lenient about)", async () => {
    const provider = fakeProvider({ kind: "unreachable" })
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    expect(await ensureProAccess()).toEqual({ allowed: false, reason: "unreachable" })
  })

  it("first run unreachable then reachable → recovers in-session without a restart", async () => {
    // A transient blip on the very first check must not lock a paying user out
    // for the whole session: the next tool call retries and recovers.
    const verdicts: LicenseVerdict[] = [{ kind: "unreachable" }, { kind: "valid" }]
    const provider = {
      calls: 0,
      validate: (): Promise<LicenseVerdict> => {
        const v = verdicts[provider.calls] ?? { kind: "valid" }
        provider.calls++
        return Promise.resolve(v)
      },
    }
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    expect(await ensureProAccess()).toEqual({ allowed: false, reason: "unreachable" })
    expect(await ensureProAccess()).toEqual({ allowed: true })
    expect(provider.calls).toBe(2)
  })

  it("cached revoked + repeated unreachable still re-checks at most once per process", async () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("key-1"),
      lastVerdict: "revoked",
      checkedAt: daysAgo(2),
    })
    const provider = fakeProvider({ kind: "unreachable" })
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    await ensureProAccess()
    await ensureProAccess()
    await ensureProAccess()
    expect(provider.calls).toBe(1)
  })

  it("grace window + repeated unreachable re-checks at most once per process", async () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("key-1"),
      lastVerdict: "valid",
      checkedAt: daysAgo(35),
    })
    const provider = fakeProvider({ kind: "unreachable" })
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    await ensureProAccess()
    await ensureProAccess()
    await ensureProAccess()
    expect(provider.calls).toBe(1)
  })

  it("fresh cached valid verdict → pro without any network call", async () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("key-1"),
      lastVerdict: "valid",
      checkedAt: daysAgo(1),
    })
    const provider = fakeProvider({ kind: "valid" })
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    expect(getTier()).toBe("pro")
    expect(await ensureProAccess()).toEqual({ allowed: true })
    expect(provider.calls).toBe(0)
  })

  it("token older than 30d but inside grace → still pro while the refresh fails", async () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("key-1"),
      lastVerdict: "valid",
      checkedAt: daysAgo(35),
    })
    const provider = fakeProvider({ kind: "unreachable" })
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    expect(getTier()).toBe("pro") // grace window
    expect(await ensureProAccess()).toEqual({ allowed: true })
    expect(provider.calls).toBe(1)
  })

  it("grace exhausted and still unreachable → free with unreachable reason", async () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("key-1"),
      lastVerdict: "valid",
      checkedAt: daysAgo(50),
    })
    const provider = fakeProvider({ kind: "unreachable" })
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    expect(await ensureProAccess()).toEqual({ allowed: false, reason: "unreachable" })
  })

  it("grace exhausted but the server answers valid → pro again, cache refreshed", async () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("key-1"),
      lastVerdict: "valid",
      checkedAt: daysAgo(50),
    })
    const provider = fakeProvider({ kind: "valid" })
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    expect(await ensureProAccess()).toEqual({ allowed: true })
    expect(provider.calls).toBe(1)
  })

  it("revoked verdict → free with revoked reason, persisted", async () => {
    const provider = fakeProvider({ kind: "revoked" })
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    expect(await ensureProAccess()).toEqual({ allowed: false, reason: "revoked" })
    expect(getTier()).toBe("free")
  })

  it("cached revoked re-validates at most once per process (renewal recovers on restart)", async () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("key-1"),
      lastVerdict: "revoked",
      checkedAt: daysAgo(2),
    })
    const provider = fakeProvider({ kind: "revoked" })
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    expect(await ensureProAccess()).toEqual({ allowed: false, reason: "revoked" })
    expect(await ensureProAccess()).toEqual({ allowed: false, reason: "revoked" })
    expect(provider.calls).toBe(1)
  })

  it("cached revoked recovers immediately when the server says valid again", async () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("key-1"),
      lastVerdict: "revoked",
      checkedAt: daysAgo(2),
    })
    const provider = fakeProvider({ kind: "valid" })
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    expect(await ensureProAccess()).toEqual({ allowed: true })
    expect(provider.calls).toBe(1)
  })

  it("a clock set backward (checkedAt in the future) never locks a paying user out", async () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("key-1"),
      lastVerdict: "valid",
      checkedAt: daysAgo(-3), // three days in the future
    })
    const provider = fakeProvider({ kind: "unreachable" })
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    expect(getTier()).toBe("pro")
    expect(await ensureProAccess()).toEqual({ allowed: true })
    expect(provider.calls).toBe(0) // negative age counts as fresh; no refresh due
  })

  it("a changed key ignores the old cache", async () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("old-key"),
      lastVerdict: "valid",
      checkedAt: daysAgo(1),
    })
    const provider = fakeProvider({ kind: "valid" })
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: "new-key",
      provider,
    })
    expect(getTier()).toBe("free") // old cache doesn't count
    expect(await ensureProAccess()).toEqual({ allowed: true })
    expect(provider.calls).toBe(1)
  })

  it("parallel ensure calls share a single network exchange", async () => {
    let release: (v: LicenseVerdict) => void = () => undefined
    const gate = new Promise<LicenseVerdict>((resolve) => {
      release = resolve
    })
    const provider = {
      calls: 0,
      validate: (): Promise<LicenseVerdict> => {
        provider.calls++
        return gate
      },
    }
    initLicensing({ paywallEnabled: true, buildFlavor: "standard", licenseKey: "key-1", provider })
    const racers = Promise.all([ensureProAccess(), ensureProAccess(), ensureProAccess()])
    release({ kind: "valid" })
    const results = await racers
    expect(provider.calls).toBe(1)
    expect(results.every((r) => r.allowed)).toBe(true)
  })

  it("provider missing (no merchant adapter yet) → cache and grace still rule", async () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("key-1"),
      lastVerdict: "valid",
      checkedAt: daysAgo(35),
    })
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: "key-1",
      provider: null,
    })
    expect(await ensureProAccess()).toEqual({ allowed: true })
  })
})
