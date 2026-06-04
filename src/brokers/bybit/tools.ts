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
