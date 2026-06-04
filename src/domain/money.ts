export type Currency = string

export interface Money {
  readonly amount: number
  readonly currency: Currency
}
