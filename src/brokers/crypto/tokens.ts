import { TTLCache } from "../../utils/cache.js"
import { BrokerApiError } from "../../utils/errors.js"
import { withBackoff, type RetryDecision } from "../../utils/ratelimit.js"

import { JupiterTokenSearchResponse } from "./schemas.js"

const BROKER_ID = "crypto"
const BASE = "https://lite-api.jup.ag/tokens/v2/search"
const TTL_MS = 6 * 60 * 60 * 1000 // token metadata is static; cache 6h

const cache = new TTLCache<string, string>(TTL_MS)

export function shortMint(mint: string): string {
  return mint.length <= 10 ? mint : `${mint.slice(0, 4)}…${mint.slice(-4)}`
}

function retryOn5xx(error: unknown): RetryDecision {
  return error instanceof BrokerApiError && (error.statusCode ?? 0) >= 500
}

// Resolve mint -> symbol. Best-effort: network/parse failure falls back to a
// shortened mint so the orders still render. Never throws.
export async function resolveSymbols(mints: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const missing: string[] = []
  for (const m of mints) {
    const cached = cache.get(m)
    if (cached !== undefined) out.set(m, cached)
    else if (!missing.includes(m)) missing.push(m)
  }

  if (missing.length > 0) {
    try {
      const url = `${BASE}?query=${encodeURIComponent(missing.join(","))}`
      const raw = await withBackoff(async () => {
        const res = await fetch(url)
        if (!res.ok) {
          throw new BrokerApiError(
            `Jupiter token search HTTP ${String(res.status)}`,
            BROKER_ID,
            res.status,
          )
        }
        return res.json()
      }, retryOn5xx)
      const parsed = JupiterTokenSearchResponse.safeParse(raw)
      if (parsed.success) {
        for (const t of parsed.data) {
          if (t.symbol !== undefined) {
            cache.set(t.id, t.symbol)
            out.set(t.id, t.symbol)
          }
        }
      }
    } catch {
      // best-effort; fall through to mint fallback below
    }
  }

  for (const m of mints) {
    if (!out.has(m)) out.set(m, shortMint(m))
  }
  return out
}
