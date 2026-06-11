import type { Money } from "./money.js"

export interface PieDividendTotals {
  readonly gained: Money
  readonly reinvested: Money
  readonly inCash: Money
}

export interface Pie {
  readonly brokerId: string
  readonly id: string
  readonly name: string
  readonly invested: Money
  readonly currentValue: Money
  readonly unrealizedPnL: Money
  readonly cashBalance?: Money
  readonly dividends?: PieDividendTotals
  /** Progress toward the pie's goal, 0..1, when the broker reports one. */
  readonly progress?: number
  /** Broker-reported goal status (e.g. AHEAD, ON_TRACK, BEHIND). */
  readonly status?: string
}

export interface PieSlice {
  readonly ticker: string
  readonly instrumentId?: string
  readonly name?: string
  readonly targetWeight: number
  readonly currentWeight: number
  readonly quantity: number
  readonly invested: Money
  readonly currentValue: Money
  readonly unrealizedPnL: Money
}

export type AutoInvestCadence = "daily" | "weekly" | "biweekly" | "monthly"

export interface AutoInvestRule {
  readonly enabled: boolean
  readonly cadence?: AutoInvestCadence
  readonly amountPerInterval?: Money
}

export interface PieDetails extends Pie {
  readonly slices: readonly PieSlice[]
  readonly autoInvest?: AutoInvestRule
  /** What the broker does with dividends paid into the pie (e.g. REINVEST). */
  readonly dividendCashAction?: string
}
