import { fetchJson } from "../../http.js"
import { sanitizeSymbol } from "../../sanitize.js"
import {
  BlockscoutAddress,
  BlockscoutTokenBalances,
  type BlockscoutTokenBalance,
} from "../../schemas.js"
import type { RawHolding } from "../../types.js"

import { EVM_NETWORKS, type EvmNetwork } from "./networks.js"

const NATIVE_DECIMALS = 18 // ETH and POL native units are both 18-decimal
const DEFAULT_TOKEN_DECIMALS = 18 // ERC-20 default when Blockscout omits decimals
const MAX_TOKEN_DECIMALS = 36 // ERC-20 decimals is a uint8; anything larger is malformed
const DECIMAL_INTEGER = /^[0-9]+$/ // a raw on-chain integer string, nothing else

/**
 * Parse Blockscout's string `decimals`. A balance value is a raw base-10 integer
 * string by contract; anything else (hex, scientific notation, a fraction, junk)
 * is an untrusted-upstream signal, so the field falls back to the ERC-20 default
 * rather than being silently mis-read by `parseInt`/`Number`.
 */
function parseDecimals(raw: string | null | undefined): number {
  if (raw === undefined || raw === null || !DECIMAL_INTEGER.test(raw)) return DEFAULT_TOKEN_DECIMALS
  const n = Number.parseInt(raw, 10)
  return n <= MAX_TOKEN_DECIMALS ? n : DEFAULT_TOKEN_DECIMALS
}

/**
 * Convert a raw integer balance string + decimals to a number, or `null` when the
 * string is not a well-formed non-negative integer. `Number()` alone would coerce
 * "0x10"→16 and "1e30"→1e30 into a real, wrong balance — for a financial read the
 * value must be a plain base-10 integer or it is dropped.
 */
function toAmount(raw: string, decimals: number): number | null {
  if (!DECIMAL_INTEGER.test(raw)) return null
  const amount = Number(raw) / Math.pow(10, decimals)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

/**
 * Map one network's native balance and token list to priced-later holdings.
 * ERC-721/ERC-1155 entries are dropped (only fungible ERC-20 is in scope), as are
 * zero/garbage balances. Symbols are sanitised — token metadata is attacker-
 * controlled — and the DefiLlama coinId is `<chain>:<lowercase-contract>`.
 */
export function mapEvmHoldings(
  network: EvmNetwork,
  coinBalance: string | null,
  tokens: readonly BlockscoutTokenBalance[],
): RawHolding[] {
  const out: RawHolding[] = []

  const native = coinBalance === null ? null : toAmount(coinBalance, NATIVE_DECIMALS)
  if (native !== null) {
    out.push({
      chain: network.id,
      symbol: network.nativeSymbol,
      amount: native,
      coinId: network.nativeCoinId,
    })
  }

  for (const t of tokens) {
    if (t.token.type !== undefined && t.token.type !== "ERC-20") continue
    const amount = toAmount(t.value, parseDecimals(t.token.decimals))
    if (amount === null) continue
    const contract = t.token.address_hash.toLowerCase()
    out.push({
      chain: network.id,
      symbol: sanitizeSymbol(t.token.symbol) ?? contract.slice(0, 6),
      amount,
      coinId: `${network.llamaChain}:${contract}`,
    })
  }

  return out
}

/** Fetch + parse one network's native balance (wei string, or null if unseen). */
async function fetchNative(
  network: EvmNetwork,
  enc: string,
  label: string,
): Promise<string | null> {
  const raw = await fetchJson(`${network.blockscoutBase}/api/v2/addresses/${enc}`, label)
  return BlockscoutAddress.parse(raw).coin_balance ?? null
}

/** Fetch + parse one network's ERC-20 token list. */
async function fetchTokens(
  network: EvmNetwork,
  enc: string,
  label: string,
): Promise<readonly BlockscoutTokenBalance[]> {
  const raw = await fetchJson(
    `${network.blockscoutBase}/api/v2/addresses/${enc}/token-balances`,
    label,
  )
  return BlockscoutTokenBalances.parse(raw)
}

/**
 * Read one network: native balance + ERC-20 list, both keyless via Blockscout v2.
 * The two reads are isolated from each other — a failure of the heavier
 * token-balances endpoint must not discard an already-fetched native balance (and
 * vice versa). The network counts as failed only when *both* reads fail.
 */
async function readNetwork(network: EvmNetwork, address: string): Promise<RawHolding[]> {
  const enc = encodeURIComponent(address)
  const label = `Blockscout ${network.id}`
  const [nativeResult, tokensResult] = await Promise.allSettled([
    fetchNative(network, enc, label),
    fetchTokens(network, enc, label),
  ])
  if (nativeResult.status === "rejected" && tokensResult.status === "rejected") {
    throw new Error(`Blockscout ${network.id} unreachable`)
  }
  return mapEvmHoldings(
    network,
    nativeResult.status === "fulfilled" ? nativeResult.value : null,
    tokensResult.status === "fulfilled" ? tokensResult.value : [],
  )
}

/**
 * Read a single EVM address across every {@link EVM_NETWORKS} network. Per-network
 * failures are isolated — one dead instance or rate-limit must not sink the rest.
 * Only when *every* network is unreachable does this throw, so the caller marks
 * the address failed rather than silently empty.
 */
export async function fetchEvmHoldings(address: string): Promise<RawHolding[]> {
  const settled = await Promise.allSettled(EVM_NETWORKS.map((n) => readNetwork(n, address)))
  if (settled.every((r) => r.status === "rejected")) {
    throw new Error("all EVM networks were unreachable")
  }
  return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []))
}
