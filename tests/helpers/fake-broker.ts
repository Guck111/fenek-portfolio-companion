import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

import type { BrokerCapabilities, IBroker } from "../../src/brokers/base.js"
import type { Account } from "../../src/domain/account.js"
import type { Dividend } from "../../src/domain/dividend.js"
import type { Page } from "../../src/domain/pagination.js"
import type { Pie, PieDetails } from "../../src/domain/pie.js"
import type { Position } from "../../src/domain/position.js"
import type { Transaction } from "../../src/domain/transaction.js"

export interface FakeBrokerData {
  readonly id: string
  readonly name?: string
  readonly capabilities?: Partial<BrokerCapabilities>
  readonly account?: Account
  readonly accountError?: Error
  readonly positions?: readonly Position[]
  readonly transactions?: readonly Transaction[]
  readonly dividends?: readonly Dividend[]
  readonly pies?: readonly Pie[]
  readonly pieDetails?: Readonly<Record<string, PieDetails>>
}

export function makeFakeBroker(data: FakeBrokerData): IBroker {
  const capabilities: BrokerCapabilities = {
    pies: data.pies !== undefined,
    dividends: data.dividends !== undefined,
    transactions: data.transactions !== undefined,
    ...data.capabilities,
  }

  const broker: IBroker = {
    id: data.id,
    name: data.name ?? `Fake ${data.id}`,
    capabilities,
    authenticate: () => Promise.resolve(),
    getAccount: () => {
      if (data.accountError !== undefined) return Promise.reject(data.accountError)
      if (data.account !== undefined) return Promise.resolve(data.account)
      return Promise.reject(new Error("account not stubbed"))
    },
    getPositions: () => Promise.resolve(data.positions ?? []),
    getTransactions: () => Promise.resolve(makePage(data.transactions ?? [])),
    getDividends: () => Promise.resolve(makePage(data.dividends ?? [])),
  }

  if (capabilities.pies) {
    return Object.assign(broker, {
      getPies: () => Promise.resolve(data.pies ?? []),
      getPie: (id: string): Promise<PieDetails> => {
        const detail = data.pieDetails?.[id]
        if (detail !== undefined) return Promise.resolve(detail)
        return Promise.reject(new Error(`pie not stubbed: ${id}`))
      },
    })
  }

  return broker
}

function makePage<T>(items: readonly T[]): Page<T> {
  return { items, hasMore: false }
}

export function parseToolResult(result: CallToolResult): unknown {
  const first = result.content[0]
  if (first?.type !== "text") {
    throw new Error("expected first content to be a text block")
  }
  return JSON.parse(first.text)
}
