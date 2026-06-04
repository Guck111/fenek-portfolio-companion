import type { PromptMessages } from "./types.js"

const DISCLAIMER =
  "This is data analysis, not financial advice. Do not recommend buying, selling, rebalancing, or any other action. Final decisions are mine."

export const en: PromptMessages = {
  disclaimer: DISCLAIMER,

  analyze_overview: {
    description:
      "Run a quick health check on the portfolio: totals per currency, top holdings, and concentration patterns worth investigating. Reports findings only.",
    text: `Run a quick health check on my entire investment portfolio across all configured brokers.

Steps:
1. Call portfolio_overview to get totals (cash, invested, market value, unrealized P&L grouped by currency) and the top 5 positions.
2. Call portfolio_concentration with topN=10 to see ticker-level concentration.
3. Summarize:
   - Headline numbers per currency (one line each)
   - Top 5 holdings with their share of portfolio
   - Any single position above 15% of the portfolio (call it out as worth a look)
   - Any tickers held across multiple brokers or pies (note them with totals)
4. Stop after the summary.

${DISCLAIMER}`,
  },

  analyze_concentration: {
    description:
      "Look for concentration risks: single positions above 15%, tickers held across brokers or repeated across pies, currency tilts. Reports findings only.",
    text: `Analyze my portfolio for concentration risk.

Steps:
1. Call portfolio_concentration with topN=20.
2. Call portfolio_pie_overlap to find tickers held in multiple pies.
3. Surface as bulleted lists, in this order:
   - Tickers with more than 15% share of total portfolio (per primary currency)
   - Tickers held across multiple brokers (show broker list and aggregate market value)
   - Tickers in more than one pie (show each pie with its target weight)
   - Currency tilt: the largest currency bucket if more than one currency is present
4. Stop after the lists.

${DISCLAIMER}`,
  },

  review_pie: {
    description:
      "Deep-dive into one Trading 212 pie: composition, drift from target weights, P&L per slice, overlap with other pies. Reports findings only.",
    pie_id_arg_description: "The Trading 212 pie id (numeric string).",
    text: (pieId: string): string => `Deep-dive on pie ${pieId}.

Steps:
1. Call t212_get_pie with id="${pieId}" to get full slice detail.
2. Call portfolio_pie_overlap to see which tickers in this pie also appear in other pies.
3. Report:
   - Pie name, total invested, current value, and unrealized P&L (raw numbers)
   - Each slice with: ticker, target weight, current weight, drift = current - target, invested, P&L
   - The largest absolute drift across slices (just point it out, do not say what to do about it)
   - Tickers in this pie that overlap with other pies — list each with the overlapping pie's name and target weight
4. Stop after reporting.

${DISCLAIMER}`,
  },

  review_dividends: {
    description:
      "Summarize dividend income across brokers. Without arguments: yearly totals plus top dividend payers. With `year`: per-ticker breakdown for that year. Reports figures only.",
    year_arg_description: "Optional 4-digit year (e.g. 2025) to scope the report.",
    text_no_year: `Summarize my dividend income across all configured brokers.

Steps:
1. Call portfolio_dividend_history with groupBy="year" to get year-over-year totals.
2. Call portfolio_dividend_history with groupBy="ticker" to get top dividend payers.
3. Report:
   - Yearly totals (gross and net) per currency
   - Top 10 dividend-paying tickers with cumulative gross and net per currency
   - If groupBy="ticker" returned no data: state explicitly that there is no recorded dividend history
4. Stop after reporting.

${DISCLAIMER}`,
    text_with_year: (year: string): string => `Summarize dividend income for ${year}.

Steps:
1. Call portfolio_dividend_history with groupBy="ticker", fromDate="${year}-01-01T00:00:00Z", toDate="${year}-12-31T23:59:59Z".
2. Report:
   - Year total (gross and net) per currency
   - Per-ticker breakdown sorted by gross amount descending
   - Number of payments in the year
   - If no dividends were recorded for ${year}: state that explicitly
3. Stop after reporting.

${DISCLAIMER}`,
  },
}
