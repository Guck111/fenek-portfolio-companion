import type { Money } from "./money.js"

export interface Pie {
  readonly brokerId: string
  readonly id: string
  readonly name: string
  readonly invested: Money
  readonly currentValue: Money
  readonly unrealizedPnL: Money
  readonly cashBalance?: Money
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
}
