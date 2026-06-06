import { BrokerApiError } from "../../../../utils/errors.js"
import { withBackoff, type RetryDecision } from "../../../../utils/ratelimit.js"
import { BlockcypherBalance } from "../../schemas.js"
import type { RawHolding } from "../../types.js"

const BROKER_ID = "crypto"
const SATS_PER_COIN = 100_000_000

export interface BlockcypherChain {
  /** Blockcypher coin path segment, e.g. "doge" → /v1/doge/main. */
  readonly coin: string
  readonly chain: RawHolding["chain"]
  readonly symbol: string
  readonly coinId: string
}

/**
 * Dogecoin via blockcypher's keyless tier. Esplora has no Dogecoin instance and
 * blockchair IP-blacklists without a key, so blockcypher is the keyless fit here.
 */
export const DOGECOIN: BlockcypherChain = {
  coin: "doge",
  chain: "dogecoin",
  symbol: "DOGE",
  coinId: "coingecko:dogecoin",
}

export function mapBlockcypherBalance(chain: BlockcypherChain, sats: number): RawHolding[] {
  const amount = sats / SATS_PER_COIN
  if (!Number.isFinite(amount) || amount <= 0) return []
  return [{ chain: chain.chain, symbol: chain.symbol, amount, coinId: chain.coinId }]
}

function retryOn5xx(error: unknown): RetryDecision {
  return error instanceof BrokerApiError && (error.statusCode ?? 0) >= 500
}

/** One address's native-coin balance via blockcypher. Single address, not a whole HD wallet (design §8). */
export function blockcypherReader(
  chain: BlockcypherChain,
): (address: string) => Promise<RawHolding[]> {
  return async (address) => {
    const url = `https://api.blockcypher.com/v1/${chain.coin}/main/addrs/${address}/balance`
    const raw = await withBackoff(async () => {
      const res = await fetch(url)
      if (!res.ok) {
        throw new BrokerApiError(`Blockcypher HTTP ${String(res.status)}`, BROKER_ID, res.status)
      }
      return res.json()
    }, retryOn5xx)
    return mapBlockcypherBalance(chain, BlockcypherBalance.parse(raw).final_balance)
  }
}
