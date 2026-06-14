/**
 * Normalised holding from a chain reader, before pricing.
 *
 * `coinId` is the DefiLlama coin id used to fetch a USD price. The `chain` union
 * widens as readers for more networks are added.
 */
export interface RawHolding {
  readonly chain:
    | "solana"
    | "ton"
    | "bitcoin"
    | "litecoin"
    | "dogecoin"
    // EVM family: one 0x address fans out across these networks, each carrying
    // its own holdings, so the label is the concrete network (e.g. "USDC (base)").
    | "ethereum"
    | "arbitrum"
    | "optimism"
    | "base"
    | "polygon"
  readonly symbol: string
  readonly amount: number
  readonly coinId: string
}
