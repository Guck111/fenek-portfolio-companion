import { detectBitcoin } from "./chains/bitcoin/detect.js"
import { detectDogecoin } from "./chains/dogecoin/detect.js"
import { detectSolana } from "./chains/solana/detect.js"
import { fetchSolanaHoldings } from "./chains/solana/read.js"
import { fetchTonHoldings } from "./chains/ton.js"
import { detectTon } from "./chains/ton/detect.js"
import { BITCOIN, esploraReader } from "./chains/utxo/esplora.js"
import type { RawHolding } from "./types.js"

/**
 * Chain registry for the crypto adapter — mirrors the broker registry.
 *
 * Adding a network is "one folder + one line here": implement
 * `chains/<id>/detect.ts` (and `read.ts`) and append a {@link ChainModule} to
 * {@link CHAINS}. Core and existing chains stay untouched.
 */

/** Normalised chain namespaces the detector can recognise. EVM chains collapse to one id. */
export type ChainId = "solana" | "dogecoin" | "bitcoin" | "ton"

export interface ChainModule {
  readonly id: ChainId
  /**
   * Strict validator: true only when `raw` is a well-formed address of this
   * chain (format + checksum), never a guess from the leading characters.
   */
  readonly detect: (raw: string) => boolean
  /** Keyless reader for one address. Absent until the chain's reader is built. */
  readonly read?: (address: string) => Promise<RawHolding[]>
}

/** Registered chains, tried in order by {@link detectChain}. */
export const CHAINS: readonly ChainModule[] = [
  { id: "solana", detect: detectSolana, read: fetchSolanaHoldings },
  { id: "dogecoin", detect: detectDogecoin },
  { id: "bitcoin", detect: detectBitcoin, read: esploraReader(BITCOIN) },
  { id: "ton", detect: detectTon, read: fetchTonHoldings },
]

/** Return the chain whose validator accepts `raw`, or null if none recognise it. */
export function detectChain(raw: string): ChainId | null {
  for (const chain of CHAINS) {
    if (chain.detect(raw)) return chain.id
  }
  return null
}

export interface AddressRouting {
  /** Recognised addresses grouped by chain, each list in input order. */
  readonly byChain: ReadonlyMap<ChainId, string[]>
  /** Addresses no registered chain recognised — surfaced to the user, never fatal. */
  readonly unrecognized: readonly string[]
}

/** Route a list of addresses to their chains via {@link detectChain}. Pure; never throws. */
export function groupAddressesByChain(addresses: readonly string[]): AddressRouting {
  const byChain = new Map<ChainId, string[]>()
  const unrecognized: string[] = []
  for (const address of addresses) {
    const chain = detectChain(address)
    if (chain === null) {
      unrecognized.push(address)
      continue
    }
    const list = byChain.get(chain)
    if (list === undefined) byChain.set(chain, [address])
    else list.push(address)
  }
  return { byChain, unrecognized }
}

export type ChainReader = (address: string) => Promise<RawHolding[]>

export interface ReadResult {
  /** Holdings collected across every address that read successfully. */
  readonly holdings: RawHolding[]
  /** Addresses no chain recognised. */
  readonly unrecognized: readonly string[]
  /** Recognised addresses whose reader threw — isolated, so the rest still load. */
  readonly failed: string[]
}

/**
 * Route addresses, then read each with the chain's reader (looked up via
 * `readerFor`, injectable for tests). Per-address failures are isolated: one
 * dead endpoint never sinks the others. Chains without a reader are skipped.
 */
export async function readHoldings(
  addresses: readonly string[],
  readerFor: (chain: ChainId) => ChainReader | undefined,
): Promise<ReadResult> {
  const { byChain, unrecognized } = groupAddressesByChain(addresses)
  const holdings: RawHolding[] = []
  const failed: string[] = []
  for (const [chain, addrs] of byChain) {
    const read = readerFor(chain)
    if (read === undefined) continue
    for (const address of addrs) {
      try {
        holdings.push(...(await read(address)))
      } catch {
        failed.push(address)
      }
    }
  }
  return { holdings, unrecognized, failed }
}
