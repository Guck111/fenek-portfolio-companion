import type { Money } from "./money.js"

// Money that lives OUTSIDE a broker's main account/positions — e.g. an
// exchange's Funding wallet or its total equity across every account type
// (Earn, Trading Bots, Copy Trading), which getAccount()/getPositions() do not
// cover. `totalValue` is the all-account fiat total when the source reports one;
// `coins` are bare holdings (coin + quantity) for which no per-coin USD price is
// available — quantities are NEVER to be read as money.
export interface OffAccountBalances {
  readonly totalValue?: Money
  readonly coins: readonly { readonly coin: string; readonly quantity: number }[]
}
