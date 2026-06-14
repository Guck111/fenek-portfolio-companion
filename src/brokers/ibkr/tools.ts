import { z } from "zod"

import { parseArgs, safeRun } from "../../tools/result.js"
import type { ToolBinding } from "../base.js"

import type { IbkrBroker, StatementMeta } from "./index.js"

const EmptyArgs = z.object({}).strict()

const FRESHNESS_NOTE =
  "End-of-day IBKR Flex reporting data, as of the statement date — not a live intraday quote."

// Broker-specific freshness envelope. Domain models carry no as-of date, so the
// statement's generation date and period are surfaced here (in tools.ts) without
// touching the shared domain types.
function envelope(meta: StatementMeta, payload: Record<string, unknown>): Record<string, unknown> {
  return {
    asOf: meta.whenGenerated ?? meta.toDate ?? null,
    period: { from: meta.fromDate ?? null, to: meta.toDate ?? null },
    accountId: meta.accountId,
    note: FRESHNESS_NOTE,
    ...payload,
  }
}

export function createIbkrTools(broker: IbkrBroker): readonly ToolBinding[] {
  return [
    {
      tool: {
        name: "ibkr_get_account",
        annotations: { title: "Interactive Brokers: Account Summary", openWorldHint: true },
        description:
          "Returns the Interactive Brokers account summary from the configured Flex Query: account id, base currency, cash, invested (equity market value) and total value (NAV). End-of-day reporting data, not a live quote. Requires the Flex Query to include the Net Asset Value and Cash Report sections.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(async () =>
          envelope(await broker.getStatementMeta(), { account: await broker.getAccount() }),
        )
      },
    },
    {
      tool: {
        name: "ibkr_get_positions",
        annotations: { title: "Interactive Brokers: Open Positions", openWorldHint: true },
        description:
          "Returns Interactive Brokers open positions from the Flex Query: symbol, signed quantity, mark price, market value, cost basis and unrealized P&L per holding. End-of-day data, not live. Requires the Flex Query to include the Open Positions section.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(async () =>
          envelope(await broker.getStatementMeta(), { positions: await broker.getPositions() }),
        )
      },
    },
    {
      tool: {
        name: "ibkr_get_transactions",
        annotations: { title: "Interactive Brokers: Cash Transactions", openWorldHint: true },
        description:
          "Returns Interactive Brokers cash transactions from the Flex Query: deposits, withdrawals, interest and fees, classified by kind. End-of-day data. Requires the Flex Query to include the Cash Transactions section. Dividends are reported separately by ibkr_get_dividends.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(async () => {
          const page = await broker.getTransactions()
          return envelope(await broker.getStatementMeta(), { transactions: page.items })
        })
      },
    },
    {
      tool: {
        name: "ibkr_get_dividends",
        annotations: { title: "Interactive Brokers: Dividends", openWorldHint: true },
        description:
          "Returns Interactive Brokers dividends from the Flex Query, with gross amount, withholding tax (netted) and net amount per payment, including payments in lieu. End-of-day data. Requires the Flex Query to include the Cash Transactions section.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(async () => {
          const page = await broker.getDividends()
          return envelope(await broker.getStatementMeta(), { dividends: page.items })
        })
      },
    },
    {
      tool: {
        name: "ibkr_get_trades",
        annotations: { title: "Interactive Brokers: Trade History", openWorldHint: true },
        description:
          "Returns Interactive Brokers executed trades from the Flex Query in raw IBKR form: symbol, buySell side, signed quantity, trade price, commission, net cash and realized P&L. End-of-day data. Requires the Flex Query to include the Trades section.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(async () =>
          envelope(await broker.getStatementMeta(), { trades: await broker.getTrades() }),
        )
      },
    },
  ]
}
