import { z } from "zod"

import type { Account } from "../../domain/account.js"
import type { Money } from "../../domain/money.js"
import type { Position } from "../../domain/position.js"
import type { ToolBinding } from "../../brokers/base.js"
import { list as listBrokers } from "../../brokers/registry.js"
import { parseArgs, safeRun } from "../result.js"

import {
  addMoney,
  addToBucket,
  bucketToMoneyList,
  roundBucket,
  roundMoney,
  type MoneyByCurrency,
} from "./aggregation.js"
import { collectBroker, type BrokerFailure } from "./resilience.js"

const Args = z
  .object({
    topPositions: z.number().int().min(1).max(20).optional(),
  })
  .strict()

const DEFAULT_TOP = 5

export function createPortfolioOverviewTool(): ToolBinding {
  return {
    tool: {
      name: "portfolio_overview",
      annotations: { title: "Portfolio: Overview (All Brokers)", openWorldHint: true },
      description:
        "Aggregates a snapshot across all configured brokers: cash, invested capital, total market value, and unrealized P&L grouped by currency (no FX conversion). Includes the largest positions ranked by raw market-value amount; ranking is accurate for single-currency portfolios but only approximate when multiple currencies are mixed.",
      inputSchema: {
        type: "object",
        properties: {
          topPositions: {
            type: "integer",
            minimum: 1,
            maximum: 20,
            description: "Number of largest positions to include (default 5).",
          },
        },
        additionalProperties: false,
      },
    },
    handler: async (args) => {
      const r = parseArgs(Args, args)
      if (!r.ok) return r.result
      return safeRun(() => buildOverview(r.data.topPositions ?? DEFAULT_TOP))
    },
  }
}

interface BrokerSnapshot {
  readonly brokerId: string
  readonly brokerName: string
  readonly account: Account | null
  readonly positions: readonly Position[]
}

async function buildOverview(topN: number): Promise<unknown> {
  const brokers = listBrokers()
  if (brokers.length === 0) {
    return {
      brokers: [],
      totals: emptyTotals(),
      topPositions: [],
      errors: [],
    }
  }

  const snapshots: BrokerSnapshot[] = []
  const errors: BrokerFailure[] = []
  for (const broker of brokers) {
    const positions = await collectBroker(broker, () => broker.getPositions(), errors)
    if (positions === undefined) continue
    let account: Account | null = null
    try {
      account = await broker.getAccount()
    } catch {
      account = null
    }
    snapshots.push({ brokerId: broker.id, brokerName: broker.name, account, positions })
  }

  let cash: MoneyByCurrency = {}
  let invested: MoneyByCurrency = {}
  let value: MoneyByCurrency = {}
  let pnl: MoneyByCurrency = {}

  for (const snap of snapshots) {
    if (snap.account !== null) {
      cash = addMoney(cash, snap.account.cash)
      if (snap.account.invested !== undefined) {
        invested = addMoney(invested, snap.account.invested)
      }
      value = addMoney(value, snap.account.totalValue)
      if (snap.account.unrealizedPnL !== undefined) {
        pnl = addMoney(pnl, snap.account.unrealizedPnL)
      }
    } else {
      for (const p of snap.positions) {
        value = addMoney(value, p.marketValue)
        if (p.unrealizedPnL !== undefined) {
          pnl = addMoney(pnl, p.unrealizedPnL)
          invested = addToBucket(
            invested,
            p.marketValue.amount - p.unrealizedPnL.amount,
            p.marketValue.currency,
          )
        }
      }
    }
  }

  const flatPositions = snapshots.flatMap((snap) =>
    snap.positions.map((p) => ({
      brokerId: snap.brokerId,
      brokerName: snap.brokerName,
      position: p,
    })),
  )
  const top = [...flatPositions]
    .sort((a, b) => b.position.marketValue.amount - a.position.marketValue.amount)
    .slice(0, topN)

  return {
    brokers: snapshots.map((s) => ({
      id: s.brokerId,
      name: s.brokerName,
      hasAccountScope: s.account !== null,
      positionCount: s.positions.length,
    })),
    totals: {
      cash: bucketToMoneyList(roundBucket(cash)),
      invested: bucketToMoneyList(roundBucket(invested)),
      marketValue: bucketToMoneyList(roundBucket(value)),
      unrealizedPnL: bucketToMoneyList(roundBucket(pnl)),
    },
    topPositions: top.map((entry) => ({
      brokerId: entry.brokerId,
      brokerName: entry.brokerName,
      ticker: entry.position.ticker,
      ...(entry.position.name !== undefined ? { name: entry.position.name } : {}),
      quantity: entry.position.quantity,
      marketValue: roundMoney(entry.position.marketValue),
      ...(entry.position.unrealizedPnL !== undefined
        ? { unrealizedPnL: roundMoney(entry.position.unrealizedPnL) }
        : {}),
    })),
    errors,
  }
}

function emptyTotals(): {
  readonly cash: readonly Money[]
  readonly invested: readonly Money[]
  readonly marketValue: readonly Money[]
  readonly unrealizedPnL: readonly Money[]
} {
  return { cash: [], invested: [], marketValue: [], unrealizedPnL: [] }
}
