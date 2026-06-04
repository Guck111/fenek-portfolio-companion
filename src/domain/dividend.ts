import type { Money } from "./money.js"

export type DividendType = "cash" | "stock" | "reinvested"

export interface Dividend {
  readonly brokerId: string
  readonly id: string
  readonly ticker: string
  readonly instrumentId?: string
  readonly grossAmount: Money
  readonly netAmount: Money
  readonly taxWithheld?: Money
  readonly paidDate: string
  readonly type?: DividendType
}
