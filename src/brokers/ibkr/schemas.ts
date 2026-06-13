import { z } from "zod"

// IBKR Flex attribute values arrive as strings and MAY carry thousands separators
// depending on report config. Strip commas, then coerce — zod owns the conversion
// so the XML reader can stay agnostic about types.
export const flexNumber = z
  .string()
  .transform((raw) => raw.replace(/,/g, ""))
  .pipe(z.coerce.number())

// Field names mirror the documented Flex schema (csingley/ibflex et al.). Fields
// marked `unverified` are optional until confirmed against a real sanitized export
// (see spec §14–§15). Unknown attributes are ignored (objects are non-strict).

export const AccountInformation = z.object({
  accountId: z.string(),
  currency: z.string().optional(), // unverified: populated across all account types
  name: z.string().optional(),
  accountType: z.string().optional(),
})
export type AccountInformation = z.infer<typeof AccountInformation>

export const EquitySummaryRow = z.object({
  reportDate: z.string(),
  cash: flexNumber,
  total: flexNumber,
  stock: flexNumber.optional(),
})
export type EquitySummaryRow = z.infer<typeof EquitySummaryRow>

export const CashReportCurrencyRow = z.object({
  currency: z.string(), // may be the pseudo-value "BASE_SUMMARY"
  endingCash: flexNumber,
})
export type CashReportCurrencyRow = z.infer<typeof CashReportCurrencyRow>

export const OpenPosition = z.object({
  symbol: z.string(),
  description: z.string().optional(),
  conid: z.string().optional(),
  position: flexNumber, // SIGNED quantity — there is no separate `quantity` attr
  markPrice: flexNumber,
  positionValue: flexNumber,
  costBasisPrice: flexNumber.optional(),
  fifoPnlUnrealized: flexNumber.optional(),
  currency: z.string(),
  assetCategory: z.string().optional(),
})
export type OpenPosition = z.infer<typeof OpenPosition>

export const CashTransaction = z.object({
  type: z.string(), // free string, not a strict enum — IBKR adds new action types
  symbol: z.string().optional(),
  conid: z.string().optional(),
  amount: flexNumber,
  currency: z.string(),
  dateTime: z.string().optional(),
  settleDate: z.string().optional(),
  description: z.string().optional(),
  transactionID: z.string().optional(),
})
export type CashTransaction = z.infer<typeof CashTransaction>

export const Trade = z.object({
  symbol: z.string(),
  description: z.string().optional(),
  assetCategory: z.string().optional(),
  currency: z.string(),
  buySell: z.string().optional(),
  quantity: flexNumber, // signed
  tradePrice: flexNumber,
  ibCommission: flexNumber.optional(),
  netCash: flexNumber.optional(),
  fifoPnlRealized: flexNumber.optional(),
  dateTime: z.string().optional(),
})
export type Trade = z.infer<typeof Trade>
