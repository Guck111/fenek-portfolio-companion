import type { Money } from "../../domain/money.js"

export type MoneyByCurrency = Readonly<Record<string, number>>

export function addToBucket(
  bucket: MoneyByCurrency,
  amount: number,
  currency: string,
): MoneyByCurrency {
  const existing = bucket[currency] ?? 0
  return { ...bucket, [currency]: existing + amount }
}

export function addMoney(bucket: MoneyByCurrency, money: Money): MoneyByCurrency {
  return addToBucket(bucket, money.amount, money.currency)
}

export function bucketToMoneyList(bucket: MoneyByCurrency): readonly Money[] {
  return Object.entries(bucket).map(([currency, amount]) => ({ amount, currency }))
}

export function roundMoney(money: Money, fractionDigits = 2): Money {
  const factor = Math.pow(10, fractionDigits)
  return { amount: Math.round(money.amount * factor) / factor, currency: money.currency }
}

export function roundBucket(bucket: MoneyByCurrency, fractionDigits = 2): MoneyByCurrency {
  const factor = Math.pow(10, fractionDigits)
  const out: Record<string, number> = {}
  for (const [ccy, amount] of Object.entries(bucket)) {
    out[ccy] = Math.round(amount * factor) / factor
  }
  return out
}
