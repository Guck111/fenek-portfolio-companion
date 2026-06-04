import { TTLCache } from "../../utils/cache.js"
import { BrokerApiError } from "../../utils/errors.js"
import { withBackoff, type RetryDecision } from "../../utils/ratelimit.js"

import { DefiLlamaPricesResponse } from "./schemas.js"

const BROKER_ID = "crypto"
const BASE = "https://coins.llama.fi/prices/current"
const PRICE_TTL_MS = 60_000

export function parsePrices(raw: unknown): Map<string, number> {
  const parsed = DefiLlamaPricesResponse.parse(raw)
  const out = new Map<string, number>()
  for (const [coinId, entry] of Object.entries(parsed.coins)) {
    out.set(coinId, entry.price)
  }
  return out
}

const cache = new TTLCache<string, number>(PRICE_TTL_MS)

function retryOn5xx(error: unknown): RetryDecision {
  return error instanceof BrokerApiError && (error.statusCode ?? 0) >= 500
}

export async function getPrices(coinIds: readonly string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  const missing: string[] = []
  for (const id of coinIds) {
    const cached = cache.get(id)
    if (cached !== undefined) result.set(id, cached)
    else missing.push(id)
  }
  if (missing.length === 0) return result

  const url = `${BASE}/${encodeURIComponent(missing.join(","))}`
  const raw = await withBackoff(async () => {
    const res = await fetch(url)
    if (!res.ok) {
      throw new BrokerApiError(`DefiLlama prices HTTP ${String(res.status)}`, BROKER_ID, res.status)
    }
    return res.json()
  }, retryOn5xx)

  for (const [id, price] of parsePrices(raw)) {
    cache.set(id, price)
    result.set(id, price)
  }
  return result
}
