import { z } from "zod"

import type { LicenseProvider, LicenseVerdict } from "./provider.js"

// Polar's customer-portal validation needs only the license key (the user's
// secret) plus the public organization_id — no organization access token. That
// is the whole reason this adapter can ship inside an open-source, locally-run
// extension: nothing secret leaves the machine, organizationId is a public
// identifier, and the key belongs to the user.
// Docs: https://polar.sh/docs/features/benefits/license-keys
export interface PolarConfig {
  // https://api.polar.sh (production) | https://sandbox-api.polar.sh (sandbox)
  readonly baseUrl: string
  // Public organization UUID — safe to hardcode in source.
  readonly organizationId: string
}

const VALIDATE_PATH = "/v1/customer-portal/license-keys/validate"

// A license check must not hang a Pro tool call; on a slow or dead license
// server we fail fast to "unreachable" and let the grace window (manager.ts)
// keep a paying user working.
const REQUEST_TIMEOUT_MS = 8000

// Read only what the verdict needs and tolerate any extra fields. expires_at is
// null in our setup — the subscription benefit carries no fixed expiry, so the
// 30-day re-check cadence (manager.ts), not the key's TTL, drives revalidation.
const ValidatedLicenseKey = z.object({
  status: z.string(),
  expires_at: z.string().nullish(),
})

const REVOKED_STATUSES = new Set(["revoked", "disabled", "expired"])

export function createPolarProvider(config: PolarConfig): LicenseProvider {
  const url = `${config.baseUrl}${VALIDATE_PATH}`
  return {
    async validate(key: string): Promise<LicenseVerdict> {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ key, organization_id: config.organizationId }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
        // A definite "no such key in this organization" is the only 4xx we read
        // as a real negative. Every other non-2xx (403, 422, 5xx, …) is
        // ambiguous or transient, so we stay lenient and report "unreachable".
        if (res.status === 404) return { kind: "revoked" }
        if (!res.ok) return { kind: "unreachable" }
        const parsed = ValidatedLicenseKey.safeParse(await res.json())
        if (!parsed.success) return { kind: "unreachable" }
        const { status, expires_at: expiresAt } = parsed.data
        if (status === "granted") {
          return expiresAt == null ? { kind: "valid" } : { kind: "valid", validUntil: expiresAt }
        }
        if (REVOKED_STATUSES.has(status)) return { kind: "revoked" }
        // Unknown status — don't trust an unfamiliar answer enough to revoke.
        return { kind: "unreachable" }
      } catch {
        // Timeout, DNS failure, abort, or an unreadable body — all transient.
        return { kind: "unreachable" }
      }
    },
  }
}
