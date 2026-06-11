import type { Money } from "./money.js"

export type DividendType = "cash" | "stock" | "reinvested"

export interface Dividend {
  readonly brokerId: string
  readonly id: string
  readonly ticker: string
  readonly instrumentId?: string
  readonly name?: string
  readonly grossAmount: Money
  readonly netAmount: Money
  readonly taxWithheld?: Money
  readonly amountPerShare?: Money
  readonly quantity?: number
  readonly paidDate: string
  readonly type?: DividendType
  /** Broker-reported event kind (e.g. T212 ORDINARY, BONUS, INTEREST). */
  readonly kind?: string
}
