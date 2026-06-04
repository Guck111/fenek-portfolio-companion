import type { Money } from "./money.js"

export type TransactionKind = "deposit" | "withdrawal" | "fee" | "interest" | "other"

export interface Transaction {
  readonly brokerId: string
  readonly id: string
  readonly kind: TransactionKind
  readonly amount: Money
  readonly date: string
  readonly description?: string
}
