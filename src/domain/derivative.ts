// Normalized open derivatives position (perpetuals, futures, options).
// Prices and P&L are plain numbers in the contract's settle currency —
// exchanges report it per category, and inferring a Money currency from the
// symbol is unsafe (same reasoning as domain/order.ts).
export interface DerivativePosition {
  readonly brokerId: string
  readonly symbol: string
  readonly category: string
  readonly side: "long" | "short" | "none"
  readonly size: number
  readonly entryPrice?: number
  readonly markPrice?: number
  readonly positionValue?: number
  readonly unrealizedPnL?: number
  readonly realizedPnLCurrent?: number
  readonly realizedPnLCumulative?: number
  readonly leverage?: number
  readonly liquidationPrice?: number
  readonly takeProfit?: number
  readonly stopLoss?: number
  readonly updatedAt?: string
}
