import type { Account } from "../../domain/account.js"
import type { Dividend } from "../../domain/dividend.js"
import type { OpenOrder } from "../../domain/order.js"
import type { Page } from "../../domain/pagination.js"
import type { Position } from "../../domain/position.js"
import type { Transaction } from "../../domain/transaction.js"
import type { BrokerCapabilities, BrokerConfig, IBroker } from "../base.js"

import { fetchJupiterOrders, mapJupiterOrders } from "./jupiter.js"
import { parseAddresses } from "./parse.js"
import { getPrices } from "./prices.js"
import { CHAINS, groupAddressesByChain, readHoldings, type UnsupportedAddress } from "./registry.js"
import { resolveSymbols } from "./tokens.js"
import type { RawHolding } from "./types.js"

const BROKER_ID = "crypto"
const BROKER_NAME = "Crypto Wallets"
const USD = "USD"

export function assemblePositions(
  holdings: readonly RawHolding[],
  prices: ReadonlyMap<string, number>,
): { positions: Position[]; dropped: number } {
  const positions: Position[] = []
  let dropped = 0
  for (const h of holdings) {
    const price = prices.get(h.coinId)
    if (price === undefined) {
      dropped++
      continue
    }
    positions.push({
      brokerId: BROKER_ID,
      ticker: h.symbol,
      name: `${h.symbol} (${h.chain})`,
      currency: USD,
      quantity: h.amount,
      currentPrice: { amount: price, currency: USD },
      marketValue: { amount: h.amount * price, currency: USD },
    })
  }
  return { positions, dropped }
}

export function assembleAccount(positions: readonly Position[]): Account {
  const total = positions.reduce((sum, p) => sum + p.marketValue.amount, 0)
  return {
    brokerId: BROKER_ID,
    accountId: "wallets",
    currency: USD,
    cash: { amount: 0, currency: USD },
    totalValue: { amount: total, currency: USD },
  }
}

export interface CryptoReport {
  readonly positions: readonly Position[]
  readonly unrecognized: readonly string[]
  readonly unsupported: readonly UnsupportedAddress[]
  readonly failed: readonly string[]
}

export class CryptoBroker implements IBroker {
  readonly id = BROKER_ID
  readonly name = BROKER_NAME
  readonly tier = "pro" as const
  readonly capabilities: BrokerCapabilities = {
    pies: false,
    dividends: false,
    transactions: false,
  }

  private addresses: readonly string[] = []

  authenticate(config: BrokerConfig): Promise<void> {
    const field = config.credentials["WALLET_ADDRESSES"]
    this.addresses = field === undefined ? [] : parseAddresses(field)
    return Promise.resolve()
  }

  private async load(): Promise<CryptoReport> {
    const { holdings, unrecognized, unsupported, failed } = await readHoldings(
      this.addresses,
      (chain) => CHAINS.find((c) => c.id === chain)?.read,
    )
    const prices = await getPrices([...new Set(holdings.map((h) => h.coinId))])
    const { positions } = assemblePositions(holdings, prices)
    return { positions, unrecognized, unsupported, failed }
  }

  async getPositions(): Promise<readonly Position[]> {
    return (await this.load()).positions
  }

  async getAccount(): Promise<Account> {
    return assembleAccount(await this.getPositions())
  }

  /** Crypto-specific: positions plus per-address diagnostics (unrecognized / unsupported / failed). */
  async getReport(): Promise<CryptoReport> {
    return this.load()
  }

  async getLimitOrders(): Promise<readonly OpenOrder[]> {
    const solanaAddresses = groupAddressesByChain(this.addresses).byChain.get("solana") ?? []
    const out: OpenOrder[] = []
    for (const address of solanaAddresses) {
      try {
        const orders = await fetchJupiterOrders(address)
        const mints = [...new Set(orders.flatMap((o) => [o.inputMint, o.outputMint]))]
        const symbols = await resolveSymbols(mints)
        out.push(...mapJupiterOrders(orders, symbols))
      } catch {
        // isolate per-address failure; other Solana addresses still report
      }
    }
    return out
  }

  getTransactions(): Promise<Page<Transaction>> {
    return Promise.resolve({ items: [], hasMore: false })
  }

  getDividends(): Promise<Page<Dividend>> {
    return Promise.resolve({ items: [], hasMore: false })
  }
}
