import { z } from "zod"

export const T212Instrument = z.object({
  ticker: z.string(),
  name: z.string(),
  isin: z.string(),
  currency: z.string(),
})
export type T212Instrument = z.infer<typeof T212Instrument>

export const T212WalletImpact = z.object({
  currency: z.string(),
  totalCost: z.number(),
  currentValue: z.number(),
  unrealizedProfitLoss: z.number(),
  fxImpact: z.number(),
})
export type T212WalletImpact = z.infer<typeof T212WalletImpact>

export const T212Position = z.object({
  instrument: T212Instrument,
  createdAt: z.string(),
  quantity: z.number(),
  quantityAvailableForTrading: z.number(),
  quantityInPies: z.number(),
  currentPrice: z.number(),
  averagePricePaid: z.number(),
  walletImpact: T212WalletImpact,
})
export type T212Position = z.infer<typeof T212Position>

export const T212Positions = z.array(T212Position)

export const T212PieResult = z.object({
  priceAvgInvestedValue: z.number(),
  priceAvgValue: z.number(),
  priceAvgResult: z.number(),
  priceAvgResultCoef: z.number(),
})
export type T212PieResult = z.infer<typeof T212PieResult>

export const T212PieDividendDetails = z.object({
  gained: z.number(),
  reinvested: z.number(),
  inCash: z.number(),
})
export type T212PieDividendDetails = z.infer<typeof T212PieDividendDetails>

export const T212PieListEntry = z.object({
  id: z.number(),
  cash: z.number(),
  dividendDetails: T212PieDividendDetails,
  result: T212PieResult,
  progress: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
})
export type T212PieListEntry = z.infer<typeof T212PieListEntry>

export const T212PieList = z.array(T212PieListEntry)

export const T212PieSliceIssue = z.object({
  name: z.string().optional(),
  severity: z.string().optional(),
})

export const T212PieSlice = z.object({
  ticker: z.string(),
  result: T212PieResult,
  expectedShare: z.number(),
  currentShare: z.number(),
  ownedQuantity: z.number(),
  issues: z.array(T212PieSliceIssue),
})
export type T212PieSlice = z.infer<typeof T212PieSlice>

export const T212PieSettings = z.object({
  id: z.number(),
  instrumentShares: z.record(z.string(), z.number()).nullable(),
  name: z.string(),
  icon: z.string().nullable(),
  goal: z.number().nullable().optional(),
  creationDate: z.number(),
  endDate: z.string().nullable().optional(),
  initialInvestment: z.number().nullable().optional(),
  dividendCashAction: z.string(),
  publicUrl: z.string().nullable().optional(),
})
export type T212PieSettings = z.infer<typeof T212PieSettings>

export const T212PieDetails = z.object({
  instruments: z.array(T212PieSlice),
  settings: T212PieSettings,
})
export type T212PieDetails = z.infer<typeof T212PieDetails>

export const T212TransactionItem = z.object({
  type: z.string(),
  amount: z.number(),
  currency: z.string(),
  reference: z.string(),
  dateTime: z.string(),
})
export type T212TransactionItem = z.infer<typeof T212TransactionItem>

export const T212PageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextPagePath: z.string().nullable(),
  })

export const T212TransactionPage = T212PageOf(T212TransactionItem)
export type T212TransactionPage = z.infer<typeof T212TransactionPage>

// Dividend shape inferred from T212 docs; current demo account has no history
// to verify against, so non-essential fields are optional. T212 has dropped
// dateTime from live responses (paidOn is the authoritative date), so dateTime
// is also optional now.
export const T212DividendItem = z.object({
  ticker: z.string(),
  reference: z.string(),
  dateTime: z.string().optional(),
  type: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  amountInEuro: z.number().optional(),
  grossAmountPerShare: z.number().optional(),
  quantity: z.number().optional(),
  paidOn: z.string().optional(),
})
export type T212DividendItem = z.infer<typeof T212DividendItem>

export const T212DividendPage = T212PageOf(T212DividendItem)
export type T212DividendPage = z.infer<typeof T212DividendPage>

export const T212OrderTax = z.object({
  name: z.string(),
  quantity: z.number(),
  currency: z.string(),
  chargedAt: z.string(),
})

export const T212OrderFillWalletImpact = z.object({
  currency: z.string(),
  netValue: z.number(),
  fxRate: z.number(),
  taxes: z.array(T212OrderTax),
})

export const T212OrderFill = z.object({
  id: z.number(),
  quantity: z.number(),
  price: z.number(),
  type: z.string(),
  tradingMethod: z.string(),
  filledAt: z.string(),
  walletImpact: T212OrderFillWalletImpact,
})
export type T212OrderFill = z.infer<typeof T212OrderFill>

export const T212HistoricalOrderHeader = z.object({
  id: z.number(),
  strategy: z.string(),
  type: z.string(),
  ticker: z.string(),
  status: z.string(),
  value: z.number(),
  filledValue: z.number(),
  currency: z.string(),
  extendedHours: z.boolean(),
  initiatedFrom: z.string(),
  side: z.string(),
  createdAt: z.string(),
  instrument: T212Instrument,
})

export const T212HistoricalOrderItem = z.object({
  order: T212HistoricalOrderHeader,
  fill: T212OrderFill.nullable(),
})
export type T212HistoricalOrderItem = z.infer<typeof T212HistoricalOrderItem>

export const T212HistoricalOrderPage = T212PageOf(T212HistoricalOrderItem)
export type T212HistoricalOrderPage = z.infer<typeof T212HistoricalOrderPage>

export const T212InstrumentMetadata = z.object({
  ticker: z.string(),
  type: z.string(),
  workingScheduleId: z.number(),
  isin: z.string(),
  currencyCode: z.string(),
  name: z.string(),
  shortName: z.string(),
  maxOpenQuantity: z.number(),
  extendedHours: z.boolean(),
  addedOn: z.string(),
})
export type T212InstrumentMetadata = z.infer<typeof T212InstrumentMetadata>

export const T212InstrumentList = z.array(T212InstrumentMetadata)

// Account summary — granted only when API key has Account scope.
// All fields optional: T212 has changed this shape across beta revisions
// and tolerating absence is safer than hard-failing on every drift.
// The documented shape (docs.trading212.com/api) nests cash and investments;
// `currencyCode` is a legacy alias kept for tolerance.
export const T212AccountSummaryCash = z.object({
  availableToTrade: z.number().optional(),
  inPies: z.number().optional(),
  reservedForOrders: z.number().optional(),
})
export const T212AccountSummaryInvestments = z.object({
  currentValue: z.number().optional(),
  realizedProfitLoss: z.number().optional(),
  totalCost: z.number().optional(),
  unrealizedProfitLoss: z.number().optional(),
})
export const T212AccountSummary = z.object({
  id: z.number().optional(),
  currencyCode: z.string().optional(),
  currency: z.string().optional(),
  totalValue: z.number().optional(),
  cash: T212AccountSummaryCash.optional(),
  investments: T212AccountSummaryInvestments.optional(),
})
export type T212AccountSummary = z.infer<typeof T212AccountSummary>

export const T212AccountCash = z.object({
  free: z.number().optional(),
  total: z.number().optional(),
  invested: z.number().optional(),
  pieCash: z.number().optional(),
  ppl: z.number().optional(),
  result: z.number().optional(),
  blocked: z.number().optional(),
})
export type T212AccountCash = z.infer<typeof T212AccountCash>
