import type { BuildFlavor } from "../generated/build-flavor.js"

import type { LicenseProvider } from "./provider.js"
import type { ProDenialReason } from "./texts.js"
import { keyFingerprint, readLicenseState, writeLicenseState, type LicenseState } from "./state.js"

// Key→token exchange cadence and the grace window on top of it (spec §3.3).
const DAY_MS = 24 * 60 * 60 * 1000
export const CHECK_INTERVAL_MS = 30 * DAY_MS
export const GRACE_MS = 14 * DAY_MS

export type Tier = "free" | "pro"

export interface LicenseRuntime {
  readonly paywallEnabled: boolean
  readonly buildFlavor: BuildFlavor
  readonly licenseKey: string | undefined
  readonly provider: LicenseProvider | null
}

export type ProAccess =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: ProDenialReason }

const INERT_RUNTIME: LicenseRuntime = {
  paywallEnabled: false,
  buildFlavor: "standard",
  licenseKey: undefined,
  provider: null,
}

let runtime: LicenseRuntime = INERT_RUNTIME
let cached: LicenseState | undefined
let cacheLoaded = false
let networkAttempted = false
let inflight: Promise<void> | null = null

export function initLicensing(next: LicenseRuntime): void {
  runtime = next
  cached = undefined
  cacheLoaded = false
  networkAttempted = false
  inflight = null
}

export function _resetLicensingForTests(): void {
  initLicensing(INERT_RUNTIME)
}

// The paywall is "active" only on a standard build with the switch on; a
// freepro build never gates and never talks to the license server.
export function isPaywallActive(): boolean {
  return runtime.paywallEnabled && runtime.buildFlavor !== "freepro"
}

function configuredKey(): string | undefined {
  const key = runtime.licenseKey?.trim()
  return key === "" || key === undefined ? undefined : key
}

function loadCacheOnce(): void {
  if (cacheLoaded) return
  cacheLoaded = true
  const key = configuredKey()
  if (key === undefined) return
  const state = readLicenseState()
  if (state?.keyFingerprint === keyFingerprint(key)) {
    cached = state
  }
}

interface Resolution {
  readonly access: ProAccess
  readonly refreshDue: boolean
}

function resolve(nowMs: number): Resolution {
  if (!isPaywallActive()) return { access: { allowed: true }, refreshDue: false }
  if (configuredKey() === undefined) {
    return { access: { allowed: false, reason: "no-key" }, refreshDue: false }
  }
  loadCacheOnce()
  if (cached === undefined) {
    // Never validated with this key — deny until the first verdict arrives.
    return { access: { allowed: false, reason: "unreachable" }, refreshDue: true }
  }
  if (cached.lastVerdict === "revoked") {
    // Re-check at most once per process so a renewed subscription recovers
    // on the next session without waiting out the monthly cadence.
    return { access: { allowed: false, reason: "revoked" }, refreshDue: !networkAttempted }
  }
  const age = nowMs - Date.parse(cached.checkedAt)
  if (age <= CHECK_INTERVAL_MS) return { access: { allowed: true }, refreshDue: false }
  if (age <= CHECK_INTERVAL_MS + GRACE_MS) {
    return { access: { allowed: true }, refreshDue: true }
  }
  return { access: { allowed: false, reason: "unreachable" }, refreshDue: true }
}

export function getTier(): Tier {
  return resolve(Date.now()).access.allowed ? "pro" : "free"
}

async function refresh(key: string): Promise<void> {
  const provider = runtime.provider
  if (provider === null || networkAttempted) return
  networkAttempted = true
  const verdict = await provider.validate(key)
  if (verdict.kind === "unreachable") return // grace keeps ruling; checkedAt stays
  const next: LicenseState = {
    keyFingerprint: keyFingerprint(key),
    lastVerdict: verdict.kind,
    checkedAt: new Date().toISOString(),
    ...(verdict.kind === "valid" && verdict.validUntil !== undefined
      ? { validUntil: verdict.validUntil }
      : {}),
  }
  cached = next
  writeLicenseState(next)
}

export async function ensureProAccess(): Promise<ProAccess> {
  const key = configuredKey()
  const before = resolve(Date.now())
  if (!before.refreshDue || key === undefined) return before.access
  inflight ??= refresh(key)
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`fenek: license check failed: ${message}`)
    })
    .finally(() => {
      inflight = null
    })
  await inflight
  return resolve(Date.now()).access
}

// Fire-and-forget warmup for the control-plane seam: refresh the cached
// verdict in the background so the first Pro tool call doesn't pay the
// network round-trip. A no-op (zero I/O) while the paywall is inactive.
export async function warmLicenseCheck(): Promise<void> {
  if (!isPaywallActive() || configuredKey() === undefined) return
  await ensureProAccess()
}
