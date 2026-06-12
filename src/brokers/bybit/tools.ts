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
        annotations: { title: "Bybit: Coin Balances", openWorldHint: true },
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
        annotations: { title: "Bybit: Account Summary & Margin Health", openWorldHint: true },
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
        annotations: { title: "Bybit: Derivative Positions", openWorldHint: true },
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
        annotations: { title: "Bybit: Open Orders", openWorldHint: true },
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
    {
      tool: {
        name: "bybit_get_balances_overview",
        annotations: { title: "Bybit: All-Account Balances Overview", openWorldHint: true },
        description:
          "Returns total equity (USD) across ALL Bybit account types — Funding wallet, Unified Trading, Earn, Trading Bots, Copy Trading, Launchpool — with per-account coin holdings, plus Funding-wallet coin quantities. Catches money invisible to bybit_get_positions (which covers the Unified account only). Requires the Assets (Wallet) read permission on the API key; per-source failures are listed in a `failures` field.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getBalancesOverview())
      },
    },
    {
      tool: {
        name: "bybit_get_earn_positions",
        annotations: { title: "Bybit: Earn / Staked Positions", openWorldHint: true },
        description:
          "Returns staked and saving balances across Bybit Earn families — flexible savings, on-chain staking, fixed-term deposits, the BYUSDT yield token, and dual-asset products — with amount, APY (percent), claimable/accrued yield, status, and settlement time where reported. These funds do NOT appear in bybit_get_positions or bybit_get_account. Requires the Earn read permission on the API key; per-family failures are listed in a `failures` field.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getEarnPositions())
      },
    },
    {
      tool: {
        name: "bybit_get_key_info",
        annotations: { title: "Bybit: API Key Diagnostics", openWorldHint: true },
        description:
          "Reports what the configured Bybit API key can do: read-only flag, permission groups (diagnoses missing Wallet/Assets or Earn access for other tools), IP allowlist, expiry date with days remaining, and account margin mode/UTA status. Works with any permission set. Includes warnings when the key is not read-only or expires within 14 days.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      handler: async (args) => {
        const r = parseArgs(EmptyArgs, args)
        if (!r.ok) return r.result
        return safeRun(() => broker.getKeyInfo())
      },
    },
  ]
}
