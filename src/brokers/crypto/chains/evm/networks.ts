/**
 * EVM networks scanned for every `0x` address. One address holds independent
 * balances on each, so the reader fans out across this table. Adding a network
 * later is one row — provided its Blockscout instance and DefiLlama chain key are
 * verified (coverage is uneven across chains).
 *
 * Hosts and price ids verified against live endpoints 2026-06-14:
 *  - optimism.blockscout.com 301-redirects to explorer.optimism.io (pinned here);
 *  - Polygon's native token is POL — coingecko:matic-network no longer prices, so
 *    coingecko:polygon-ecosystem-token is used.
 */
export type EvmNetworkId = "ethereum" | "arbitrum" | "optimism" | "base" | "polygon"

export interface EvmNetwork {
  readonly id: EvmNetworkId
  /** Blockscout v2 base URL (no trailing slash). */
  readonly blockscoutBase: string
  /** Native gas-token symbol (all five are 18-decimal). */
  readonly nativeSymbol: string
  /** DefiLlama coin id for the native token. */
  readonly nativeCoinId: string
  /** DefiLlama chain key for `<chain>:<contract>` token pricing. */
  readonly llamaChain: string
}

export const EVM_NETWORKS: readonly EvmNetwork[] = [
  {
    id: "ethereum",
    blockscoutBase: "https://eth.blockscout.com",
    nativeSymbol: "ETH",
    nativeCoinId: "coingecko:ethereum",
    llamaChain: "ethereum",
  },
  {
    id: "arbitrum",
    blockscoutBase: "https://arbitrum.blockscout.com",
    nativeSymbol: "ETH",
    nativeCoinId: "coingecko:ethereum",
    llamaChain: "arbitrum",
  },
  {
    id: "optimism",
    blockscoutBase: "https://explorer.optimism.io",
    nativeSymbol: "ETH",
    nativeCoinId: "coingecko:ethereum",
    llamaChain: "optimism",
  },
  {
    id: "base",
    blockscoutBase: "https://base.blockscout.com",
    nativeSymbol: "ETH",
    nativeCoinId: "coingecko:ethereum",
    llamaChain: "base",
  },
  {
    id: "polygon",
    blockscoutBase: "https://polygon.blockscout.com",
    nativeSymbol: "POL",
    nativeCoinId: "coingecko:polygon-ecosystem-token",
    llamaChain: "polygon",
  },
]
