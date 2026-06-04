import { BrokerApiError } from "../../../utils/errors.js"
import { withBackoff, type RetryDecision } from "../../../utils/ratelimit.js"
import { HeliusRpcResponse, type HeliusAssetsResult } from "../schemas.js"

const BROKER_ID = "crypto"
const SOL_COIN_ID = "coingecko:solana"
const LAMPORTS_PER_SOL = 1_000_000_000

export interface RawHolding {
  readonly chain: "solana" | "ton"
  readonly symbol: string
  readonly amount: number
  readonly coinId: string // DefiLlama coin id for pricing
}

export function mapSolanaAssets(result: HeliusAssetsResult): RawHolding[] {
  const out: RawHolding[] = []
  const lamports = result.nativeBalance?.lamports ?? 0
  if (lamports > 0) {
    out.push({
      chain: "solana",
      symbol: "SOL",
      amount: lamports / LAMPORTS_PER_SOL,
      coinId: SOL_COIN_ID,
    })
  }
  for (const asset of result.items) {
    const info = asset.token_info
    if (info?.balance === undefined || info.balance <= 0) continue
    const decimals = info.decimals ?? 0
    const amount = info.balance / Math.pow(10, decimals)
    if (amount <= 0) continue
    out.push({
      chain: "solana",
      symbol: info.symbol ?? asset.id.slice(0, 6),
      amount,
      coinId: `solana:${asset.id}`,
    })
  }
  return out
}

function retryOn5xx(error: unknown): RetryDecision {
  return error instanceof BrokerApiError && (error.statusCode ?? 0) >= 500
}

export async function fetchSolanaHoldings(
  address: string,
  heliusApiKey: string,
): Promise<RawHolding[]> {
  // SECURITY: Helius authenticates via the `api-key` query param only — this is
  // the canonical method in the official SDK and docs; there is no documented
  // header form, so do NOT "simplify" this into a header (it would break auth).
  // Consequence: this URL embeds a secret. Never log `url`, never put it in an
  // error message — the throw below surfaces status only, by design. Same
  // "never log the secret" rule as the Bybit client.
  const url = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
  const raw = await withBackoff(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "getAssetsByOwner",
        params: {
          ownerAddress: address,
          page: 1,
          limit: 1000,
          displayOptions: { showFungible: true, showNativeBalance: true },
        },
      }),
    })
    if (!res.ok) {
      throw new BrokerApiError(`Helius HTTP ${String(res.status)}`, BROKER_ID, res.status)
    }
    return res.json()
  }, retryOn5xx)
  return mapSolanaAssets(HeliusRpcResponse.parse(raw).result)
}
