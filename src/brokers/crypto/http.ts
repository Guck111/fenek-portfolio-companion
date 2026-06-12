import { BrokerApiError } from "../../utils/errors.js"
import { withBackoff, type RetryDecision } from "../../utils/ratelimit.js"

const BROKER_ID = "crypto"
const REQUEST_TIMEOUT_MS = 15_000

/**
 * Retry transient upstream failures: 5xx and 429 (rate limit). The keyless public
 * endpoints these readers use are rate-limited per IP, so a 429 is expected under
 * load and must back off (CLAUDE.md §5) rather than fail the read on the first hit.
 */
export function retryTransient(error: unknown): RetryDecision {
  if (!(error instanceof BrokerApiError)) return false
  const status = error.statusCode ?? 0
  return status === 429 || status >= 500
}

/**
 * Fetch a URL and parse its JSON body, backing off on 5xx/429. `label` names the
 * source in error messages (a fixed string, never a secret). Shared by every
 * keyless crypto reader so retry policy lives in one place.
 */
export async function fetchJson(url: string, label: string, init?: RequestInit): Promise<unknown> {
  return withBackoff(async () => {
    // Per-attempt timeout: addresses are read sequentially, so one hung public
    // endpoint would otherwise stall the whole tool call.
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    if (!res.ok) {
      throw new BrokerApiError(`${label} HTTP ${String(res.status)}`, BROKER_ID, res.status)
    }
    return res.json()
  }, retryTransient)
}
