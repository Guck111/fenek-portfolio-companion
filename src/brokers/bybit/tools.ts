import { z } from "zod"

import { parseArgs, safeRun } from "../../tools/result.js"
import type { ToolBinding } from "../base.js"

import type { BybitBroker } from "./index.js"

const EmptyArgs = z.object({}).strict()

export function createBybitTools(broker: BybitBroker): readonly ToolBinding[] {
  return [
    {
      tool: {
        name: "bybit_get_positions",
        annotations: { title: "Bybit: Coin Balances" },
        description:
          "Returns the user's Bybit coin balances (UNIFIED account) valued in USD by the exchange: coin symbol, quantity, current price, and market value. No cost basis or P&L. Derivatives (perpetual/futures) positions are not included. Requires a read-only API key with Account/Wallet read permission.",
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
        name: "bybit_get_account",
        annotations: { title: "Bybit: Account Summary & Margin Health" },
        description:
          "Returns the Bybit UNIFIED account summary in USD: total equity (includes derivatives UPL and option value), wallet/margin/available balances, perp unrealized P&L, and margin health rates (accountIMRate/accountMMRate — an accountMMRate near 1 means liquidation risk), plus per-coin detail (equity, unrealized/cumulative realized P&L, borrow amount, accrued interest, locked). Requires a read-only key with Account/Wallet read permission.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getAccountReport())
      },
    },
    {
      tool: {
        name: "bybit_get_derivative_positions",
        annotations: { title: "Bybit: Derivative Positions" },
        description:
          "Returns open Bybit derivatives positions — USDT/USDC perpetuals and futures (linear), inverse contracts, and options: side (long/short), size, entry and mark price, position value, unrealized P&L, realized P&L, leverage, liquidation price, take-profit/stop-loss. Values are in the contract's settle coin. Spot coin balances are NOT included — use bybit_get_positions for those. Per-category failures are reported in a `failures` field without hiding other categories.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getDerivativePositions())
      },
    },
    {
      tool: {
        name: "bybit_get_open_orders",
        annotations: { title: "Bybit: Open Orders" },
        description:
          "Returns the user's currently open (unfilled) orders on Bybit — spot plus USDT/USDC linear (perpetual) orders: symbol, side (buy/sell), order type, limit price, quantity, filled quantity, and status. Read-only; requires an API key with read access to the Unified Trading Account. Returns an empty array if there are none.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getOpenOrders())
      },
    },
  ]
}
