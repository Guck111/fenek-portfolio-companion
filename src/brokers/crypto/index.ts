import type { Account } from "../../domain/account.js"
import type { Dividend } from "../../domain/dividend.js"
import type { OpenOrder } from "../../domain/order.js"
import type { Page } from "../../domain/pagination.js"
import type { Position } from "../../domain/position.js"
import type { Transaction } from "../../domain/transaction.js"
import type { BrokerCapabilities, BrokerConfig, IBroker } from "../base.js"

import { fetchSolanaHoldings, type RawHolding } from "./chains/solana.js"
import { fetchTonHoldings } from "./chains/ton.js"
import { fetchJupiterOrders, mapJupiterOrders } from "./jupiter.js"
import { getPrices } from "./prices.js"
import { resolveSymbols } from "./tokens.js"

const BROKER_ID = "crypto"
const BROKER_NAME = "Crypto Wallets"
const USD = "USD"

interface CryptoCredentials {
  solanaAddress?: string
  tonAddress?: string
  heliusApiKey?: string
}

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

export class CryptoBroker implements IBroker {
  readonly id = BROKER_ID
  readonly name = BROKER_NAME
  readonly capabilities: BrokerCapabilities = {
    pies: false,
    dividends: false,
    transactions: false,
  }

  private creds: CryptoCredentials = {}

  authenticate(config: BrokerConfig): Promise<void> {
    const solanaAddress = config.credentials["SOLANA_ADDRESS"]
    const tonAddress = config.credentials["TON_ADDRESS"]
    const heliusApiKey = config.credentials["HELIUS_API_KEY"]
    this.creds = {
      ...(solanaAddress !== undefined ? { solanaAddress } : {}),
      ...(tonAddress !== undefined ? { tonAddress } : {}),
      ...(heliusApiKey !== undefined ? { heliusApiKey } : {}),
    }
    return Promise.resolve()
  }

  private async loadHoldings(): Promise<RawHolding[]> {
    const holdings: RawHolding[] = []
    if (this.creds.solanaAddress !== undefined && this.creds.heliusApiKey !== undefined) {
      holdings.push(
        ...(await fetchSolanaHoldings(this.creds.solanaAddress, this.creds.heliusApiKey)),
      )
    }
    if (this.creds.tonAddress !== undefined) {
      holdings.push(...(await fetchTonHoldings(this.creds.tonAddress)))
    }
    return holdings
  }

  async getPositions(): Promise<readonly Position[]> {
    const holdings = await this.loadHoldings()
    const prices = await getPrices([...new Set(holdings.map((h) => h.coinId))])
    return assemblePositions(holdings, prices).positions
  }

  async getAccount(): Promise<Account> {
    const positions = await this.getPositions()
    return assembleAccount(positions)
  }

  async getLimitOrders(): Promise<readonly OpenOrder[]> {
    if (this.creds.solanaAddress === undefined) return []
    const orders = await fetchJupiterOrders(this.creds.solanaAddress)
    const mints = [...new Set(orders.flatMap((o) => [o.inputMint, o.outputMint]))]
    const symbols = await resolveSymbols(mints)
    return mapJupiterOrders(orders, symbols)
  }

  getTransactions(): Promise<Page<Transaction>> {
    return Promise.resolve({ items: [], hasMore: false })
  }

  getDividends(): Promise<Page<Dividend>> {
    return Promise.resolve({ items: [], hasMore: false })
  }
}
