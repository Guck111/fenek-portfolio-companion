import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

import type { BrokerCapabilities, IBroker } from "../../src/brokers/base.js"
import type { Account } from "../../src/domain/account.js"
import type { OffAccountBalances } from "../../src/domain/balances.js"
import type { DerivativeReport } from "../../src/domain/derivative.js"
import type { Dividend } from "../../src/domain/dividend.js"
import type { EarnReport } from "../../src/domain/earn.js"
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
  readonly positionsError?: Error
  readonly transactions?: readonly Transaction[]
  readonly dividends?: readonly Dividend[]
  readonly dividendsError?: Error
  readonly pies?: readonly Pie[]
  readonly piesError?: Error
  readonly pieDetails?: Readonly<Record<string, PieDetails>>
  // Optional money buckets — when set, the fake declares the matching optional
  // IBroker method so portfolio_snapshot picks it up. The *Error variants reject
  // (a whole-bucket failure) instead of resolving.
  readonly earn?: EarnReport
  readonly earnError?: Error
  readonly derivatives?: DerivativeReport
  readonly derivativesError?: Error
  readonly offAccount?: OffAccountBalances
  readonly offAccountError?: Error
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
    getPositions: () =>
      data.positionsError !== undefined
        ? Promise.reject(data.positionsError)
        : Promise.resolve(data.positions ?? []),
    getTransactions: () => Promise.resolve(makePage(data.transactions ?? [])),
    getDividends: () =>
      data.dividendsError !== undefined
        ? Promise.reject(data.dividendsError)
        : Promise.resolve(makePage(data.dividends ?? [])),
  }

  const extras: Partial<IBroker> = {}

  if (capabilities.pies) {
    extras.getPies = () =>
      data.piesError !== undefined
        ? Promise.reject(data.piesError)
        : Promise.resolve(data.pies ?? [])
    extras.getPie = (id: string): Promise<PieDetails> => {
      const detail = data.pieDetails?.[id]
      if (detail !== undefined) return Promise.resolve(detail)
      return Promise.reject(new Error(`pie not stubbed: ${id}`))
    }
  }

  if (data.earn !== undefined || data.earnError !== undefined) {
    const earn = data.earn
    extras.getEarnReport = (): Promise<EarnReport> =>
      data.earnError !== undefined
        ? Promise.reject(data.earnError)
        : Promise.resolve(earn ?? { positions: [], failures: [] })
  }

  if (data.derivatives !== undefined || data.derivativesError !== undefined) {
    const derivatives = data.derivatives
    extras.getDerivativeReport = (): Promise<DerivativeReport> =>
      data.derivativesError !== undefined
        ? Promise.reject(data.derivativesError)
        : Promise.resolve(derivatives ?? { positions: [], failures: [] })
  }

  if (data.offAccount !== undefined || data.offAccountError !== undefined) {
    const offAccount = data.offAccount
    extras.getOffAccountBalances = (): Promise<OffAccountBalances> =>
      data.offAccountError !== undefined
        ? Promise.reject(data.offAccountError)
        : Promise.resolve(offAccount ?? { coins: [] })
  }

  return Object.assign(broker, extras)
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
