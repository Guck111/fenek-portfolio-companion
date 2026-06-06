import { BrokerApiError } from "../../../../utils/errors.js"
import { withBackoff, type RetryDecision } from "../../../../utils/ratelimit.js"
import { EsploraAddress } from "../../schemas.js"
import type { RawHolding } from "../../types.js"

const BROKER_ID = "crypto"
const SATS_PER_COIN = 100_000_000

export interface EsploraChain {
  /** Esplora API base, e.g. https://mempool.space/api (blockstream.info/api is identical). */
  readonly baseUrl: string
  readonly chain: RawHolding["chain"]
  readonly symbol: string
  readonly coinId: string
}

/** Bitcoin via mempool.space — fully keyless, generous per-IP limits. */
export const BITCOIN: EsploraChain = {
  baseUrl: "https://mempool.space/api",
  chain: "bitcoin",
  symbol: "BTC",
  coinId: "coingecko:bitcoin",
}

/** Net balance in satoshis: confirmed plus mempool, each funded minus spent. */
export function esploraBalanceSats(stats: EsploraAddress): number {
  return (
    stats.chain_stats.funded_txo_sum -
    stats.chain_stats.spent_txo_sum +
    (stats.mempool_stats.funded_txo_sum - stats.mempool_stats.spent_txo_sum)
  )
}

export function mapEsploraBalance(chain: EsploraChain, sats: number): RawHolding[] {
  const amount = sats / SATS_PER_COIN
  if (!Number.isFinite(amount) || amount <= 0) return []
  return [{ chain: chain.chain, symbol: chain.symbol, amount, coinId: chain.coinId }]
}

function retryOn5xx(error: unknown): RetryDecision {
  return error instanceof BrokerApiError && (error.statusCode ?? 0) >= 500
}

/**
 * Read one address's native-coin balance from an Esplora instance. A single
 * address is not a whole HD wallet — xpub expansion is out of scope (design §8).
 */
export function esploraReader(chain: EsploraChain): (address: string) => Promise<RawHolding[]> {
  return async (address) => {
    const raw = await withBackoff(async () => {
      const res = await fetch(`${chain.baseUrl}/address/${address}`)
      if (!res.ok) {
        throw new BrokerApiError(`Esplora HTTP ${String(res.status)}`, BROKER_ID, res.status)
      }
      return res.json()
    }, retryOn5xx)
    return mapEsploraBalance(chain, esploraBalanceSats(EsploraAddress.parse(raw)))
  }
}
