import { TTLCache } from "../../utils/cache.js"

import { fetchJson } from "./http.js"
import { JupiterTokenSearchResponse } from "./schemas.js"

const BASE = "https://lite-api.jup.ag/tokens/v2/search"
const TTL_MS = 6 * 60 * 60 * 1000 // token metadata is static; cache 6h

const cache = new TTLCache<string, string>(TTL_MS)

export function shortMint(mint: string): string {
  return mint.length <= 10 ? mint : `${mint.slice(0, 4)}…${mint.slice(-4)}`
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
      const parsed = JupiterTokenSearchResponse.safeParse(
        await fetchJson(url, "Jupiter token search"),
      )
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
