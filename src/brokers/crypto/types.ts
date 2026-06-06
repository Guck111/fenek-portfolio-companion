/**
 * Normalised holding from a chain reader, before pricing.
 *
 * `coinId` is the DefiLlama coin id used to fetch a USD price. The `chain` union
 * widens as readers for more networks are added.
 */
export interface RawHolding {
  readonly chain: "solana" | "ton" | "bitcoin"
  readonly symbol: string
  readonly amount: number
  readonly coinId: string
}
