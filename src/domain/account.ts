import type { Money, Currency } from "./money.js"

export interface Account {
  readonly brokerId: string
  readonly accountId: string
  readonly currency: Currency
  readonly cash: Money
  readonly invested?: Money
  readonly totalValue: Money
  readonly unrealizedPnL?: Money
}
