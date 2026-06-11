// Normalized earn/staking position (savings, on-chain staking, fixed-term
// deposits, yield tokens, structured products). Amounts are in `coin` units;
// `apy` is normalized to percent (5.5 means 5.5% APY) because brokers report
// it in mixed formats.
export type EarnFamily = "flexible" | "onchain" | "fixed-term" | "token" | "dual-asset"

export interface EarnPosition {
  readonly brokerId: string
  readonly family: EarnFamily
  readonly coin: string
  readonly amount: number
  readonly productId?: string
  readonly apy?: number
  readonly claimableYield?: number
  readonly totalPnl?: number
  readonly status?: string
  readonly settlementTime?: string
  readonly expectedReturn?: number
}
