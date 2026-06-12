import type { OpenOrder } from "../../domain/order.js"

import { fetchJson } from "./http.js"
import { JupiterTriggerOrdersResponse, type JupiterTriggerOrder } from "./schemas.js"

const BROKER_ID = "crypto"
const BASE = "https://lite-api.jup.ag/trigger/v1/getTriggerOrders"
// totalPages is provider-controlled; never trust it unbounded. 20 pages of
// active limit orders is far beyond any real retail account.
const MAX_PAGES = 20

async function fetchPage(address: string, page: number): Promise<JupiterTriggerOrdersResponse> {
  const url = `${BASE}?user=${encodeURIComponent(address)}&orderStatus=active&page=${String(page)}`
  return JupiterTriggerOrdersResponse.parse(await fetchJson(url, "Jupiter getTriggerOrders"))
}

// Fetch all pages of active trigger (limit) orders for a Solana address.
export async function fetchJupiterOrders(address: string): Promise<JupiterTriggerOrder[]> {
  const first = await fetchPage(address, 1)
  const orders = [...first.orders]
  for (let page = 2; page <= Math.min(first.totalPages, MAX_PAGES); page++) {
    const next = await fetchPage(address, page)
    orders.push(...next.orders)
  }
  return orders
}

// A Jupiter limit order is a swap: sell inputMint -> receive outputMint at a limit
// price. makingAmount/takingAmount are UI amounts, so price = taking/making directly.
export function mapJupiterOrders(
  orders: readonly JupiterTriggerOrder[],
  symbols: ReadonlyMap<string, string>,
): OpenOrder[] {
  return orders.map((o) => {
    const making = Number(o.makingAmount)
    const taking = Number(o.takingAmount)
    const remaining =
      o.remainingMakingAmount === undefined ? making : Number(o.remainingMakingAmount)
    const inSym = symbols.get(o.inputMint) ?? o.inputMint
    const outSym = symbols.get(o.outputMint) ?? o.outputMint
    const base = {
      brokerId: BROKER_ID,
      orderId: o.orderKey,
      symbol: `${inSym}/${outSym}`,
      side: "sell" as const,
      orderType: "Limit",
      price: making > 0 ? taking / making : 0,
      quantity: making,
      filledQuantity: making - remaining,
      status: o.status ?? "active",
      category: "jupiter",
    }
    return o.createdAt !== undefined ? { ...base, createdAt: o.createdAt } : base
  })
}
