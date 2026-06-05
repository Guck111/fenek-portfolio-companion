import { detectBitcoin } from "./chains/bitcoin/detect.js"
import { detectDogecoin } from "./chains/dogecoin/detect.js"
import { detectSolana } from "./chains/solana/detect.js"

/**
 * Chain registry for the crypto adapter — mirrors the broker registry.
 *
 * Adding a network is "one folder + one line here": implement
 * `chains/<id>/detect.ts` (and later `read.ts`) and append a {@link ChainModule}
 * to {@link CHAINS}. Core and existing chains stay untouched.
 */

/** Normalised chain namespaces the detector can recognise. EVM chains collapse to one id. */
export type ChainId = "solana" | "dogecoin" | "bitcoin"

export interface ChainModule {
  readonly id: ChainId
  /**
   * Strict validator: true only when `raw` is a well-formed address of this
   * chain (format + checksum), never a guess from the leading characters.
   */
  readonly detect: (raw: string) => boolean
}

/** Registered chains, tried in order by {@link detectChain}. */
export const CHAINS: readonly ChainModule[] = [
  { id: "solana", detect: detectSolana },
  { id: "dogecoin", detect: detectDogecoin },
  { id: "bitcoin", detect: detectBitcoin },
]

/** Return the chain whose validator accepts `raw`, or null if none recognise it. */
export function detectChain(raw: string): ChainId | null {
  for (const chain of CHAINS) {
    if (chain.detect(raw)) return chain.id
  }
  return null
}
