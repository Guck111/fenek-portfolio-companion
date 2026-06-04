import { z } from "zod"

import type { PageOpts } from "../../domain/pagination.js"
import { parseArgs, safeRun } from "../../tools/result.js"
import type { ToolBinding } from "../base.js"

import type { Trading212Broker } from "./index.js"

function toPageOpts(input: {
  readonly limit?: number | undefined
  readonly cursor?: string | undefined
}): PageOpts {
  return {
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
  }
}

const PageOptsArgs = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
})

const SearchArgs = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional(),
})

const PieIdArgs = z.object({
  id: z.string().min(1),
})

const EmptyArgs = z.object({}).strict()

export function createTrading212Tools(broker: Trading212Broker): readonly ToolBinding[] {
  return [
    {
      tool: {
        name: "t212_get_account",
        description:
          "Returns Trading 212 account summary: account id, base currency, free cash, invested capital, total portfolio value, unrealized P&L. Requires the API key to have the 'Account' scope enabled.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getAccount())
      },
    },
    {
      tool: {
        name: "t212_get_positions",
        description:
          "Returns all currently open Trading 212 positions with quantity, average price paid, current price, market value (in account currency), and unrealized P&L per holding.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getPositions())
      },
    },
    {
      tool: {
        name: "t212_get_pies",
        description:
          "Lists all Trading 212 pies (custom portfolios) with id, total invested, current value, unrealized P&L, dividend totals, and progress toward target. Use t212_get_pie for slice-level detail.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getPies())
      },
    },
    {
      tool: {
        name: "t212_get_pie",
        description:
          "Returns full details of one Trading 212 pie: name, slices (each instrument with target weight, current weight, quantity, invested, current value, unrealized P&L), totals.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "Trading 212 pie id (numeric)." },
          },
          required: ["id"],
          additionalProperties: false,
        },
      },
      handler: async (args) => {
        const r = parseArgs(PieIdArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getPie(r.data.id))
      },
    },
    {
      tool: {
        name: "t212_get_dividends",
        description:
          "Returns paginated Trading 212 dividend payments. Default limit 20, max 50. Pass `cursor` from a previous response's nextCursor to fetch the next page.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 50, description: "Page size (1..50)." },
            cursor: { type: "string", description: "Cursor from a previous nextCursor." },
          },
          additionalProperties: false,
        },
      },
      handler: async (args) => {
        const r = parseArgs(PageOptsArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getDividends(toPageOpts(r.data)))
      },
    },
    {
      tool: {
        name: "t212_get_transactions",
        description:
          "Returns paginated cash transactions (deposits, withdrawals, fees, interest) for the Trading 212 account. Default limit 20, max 50.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 50, description: "Page size (1..50)." },
            cursor: { type: "string", description: "Cursor from a previous nextCursor." },
          },
          additionalProperties: false,
        },
      },
      handler: async (args) => {
        const r = parseArgs(PageOptsArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getTransactions(toPageOpts(r.data)))
      },
    },
    {
      tool: {
        name: "t212_get_order_history",
        description:
          "Returns paginated executed-order history for Trading 212: order details, fill price/quantity, FX rate, taxes/fees per fill. Use for trade history analysis.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 50, description: "Page size (1..50)." },
            cursor: { type: "string", description: "Cursor from a previous nextCursor." },
          },
          additionalProperties: false,
        },
      },
      handler: async (args) => {
        const r = parseArgs(PageOptsArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getOrderHistory(toPageOpts(r.data)))
      },
    },
    {
      tool: {
        name: "t212_get_open_orders",
        description:
          "Returns currently pending (unfilled) orders on the Trading 212 account. Returns an empty array if there are none.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getOpenOrders())
      },
    },
    {
      tool: {
        name: "t212_search_instrument",
        description:
          "Searches the Trading 212 instrument catalog by ticker, short name, or full name (case-insensitive substring). Returns up to `limit` matches with ticker, ISIN, currency, and exchange schedule id. The catalog is cached locally for 6 hours after first call.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query (ticker / name fragment)." },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 50,
              description: "Maximum matches to return (default 10).",
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
      handler: async (args) => {
        const r = parseArgs(SearchArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.searchInstruments(r.data.query, r.data.limit ?? 10))
      },
    },
  ]
}
