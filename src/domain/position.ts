import type { Money, Currency } from "./money.js"

export interface Position {
  readonly brokerId: string
  readonly ticker: string
  readonly instrumentId?: string
  readonly name?: string
  readonly currency: Currency
  readonly quantity: number
  readonly averagePrice?: Money
  readonly currentPrice: Money
  readonly marketValue: Money
  readonly unrealizedPnL?: Money
}
