import { z } from "zod"

import type { ToolBinding } from "../../brokers/base.js"
import { list as listBrokers } from "../../brokers/registry.js"
import { partitionBrokersByTier } from "../../license/gate.js"
import { AGGREGATE_EXCLUDED_NOTE } from "../../license/texts.js"
import { parseArgs, safeRun } from "../result.js"

import { addToBucket, bucketToMoneyList, roundBucket } from "./aggregation.js"
import { collectBroker, type BrokerFailure } from "./resilience.js"

const Args = z
  .object({
    topN: z.number().int().min(1).max(50).optional(),
    minShare: z.number().min(0).max(1).optional(),
  })
  .strict()

const DEFAULT_TOP_N = 10

export function createPortfolioConcentrationTool(): ToolBinding {
  return {
    tool: {
      name: "portfolio_concentration",
      annotations: {
        title: "Portfolio: Concentration by Ticker (All Brokers)",
        openWorldHint: true,
      },
      description:
        "Aggregates each ticker's total market value across all configured brokers and reports its share of the total portfolio. Useful for finding overlap when the same instrument (e.g. VOO, AAPL) is held in multiple accounts or pies. Shares are computed within each currency bucket — totals across mixed currencies are not converted.",
      inputSchema: {
        type: "object",
        properties: {
          topN: {
            type: "integer",
            minimum: 1,
            maximum: 50,
            description: "Number of top concentrations to return (default 10).",
          },
          minShare: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description:
              "Filter: only include tickers whose share of total portfolio is at least this fraction (0..1).",
          },
        },
        additionalProperties: false,
      },
    },
    handler: async (args) => {
      const r = parseArgs(Args, args)
      if (!r.ok) return r.result
      return safeRun(() => buildConcentration(r.data.topN ?? DEFAULT_TOP_N, r.data.minShare ?? 0))
    },
  }
}

interface TickerAggregate {
  readonly ticker: string
  name?: string
  readonly brokers: Set<string>
  totalQuantity: number
  amountByCurrency: Record<string, number>
  pnlByCurrency: Record<string, number>
}

async function buildConcentration(topN: number, minShare: number): Promise<unknown> {
  const { visible: brokers, excludedSources } = partitionBrokersByTier(listBrokers())
  const excludedExtras =
    excludedSources.length > 0 ? { excludedSources, note: AGGREGATE_EXCLUDED_NOTE } : {}
  const map = new Map<string, TickerAggregate>()
  let portfolioValueByCurrency: Record<string, number> = {}
  const errors: BrokerFailure[] = []

  for (const broker of brokers) {
    const positions = await collectBroker(broker, () => broker.getPositions(), errors)
    if (positions === undefined) continue
    for (const p of positions) {
      let entry = map.get(p.ticker)
      if (entry === undefined) {
        entry = {
          ticker: p.ticker,
          brokers: new Set<string>(),
          totalQuantity: 0,
          amountByCurrency: {},
          pnlByCurrency: {},
        }
        map.set(p.ticker, entry)
      }
      if (p.name !== undefined && entry.name === undefined) entry.name = p.name
      entry.brokers.add(broker.id)
      entry.totalQuantity += p.quantity
      entry.amountByCurrency = addToBucket(
        entry.amountByCurrency,
        p.marketValue.amount,
        p.marketValue.currency,
      )
      if (p.unrealizedPnL !== undefined) {
        entry.pnlByCurrency = addToBucket(
          entry.pnlByCurrency,
          p.unrealizedPnL.amount,
          p.unrealizedPnL.currency,
        )
      }
      portfolioValueByCurrency = addToBucket(
        portfolioValueByCurrency,
        p.marketValue.amount,
        p.marketValue.currency,
      )
    }
  }

  const enriched = [...map.values()]
    .map((entry) => {
      const primaryCurrency = pickPrimaryCurrency(entry.amountByCurrency)
      const primaryAmount =
        primaryCurrency === null ? 0 : (entry.amountByCurrency[primaryCurrency] ?? 0)
      const portfolioInCcy =
        primaryCurrency === null ? 0 : (portfolioValueByCurrency[primaryCurrency] ?? 0)
      const share = portfolioInCcy === 0 ? 0 : primaryAmount / portfolioInCcy
      return { entry, primaryCurrency, share }
    })
    .filter((row) => row.share >= minShare)
    .sort((a, b) => b.share - a.share)
    .slice(0, topN)

  return {
    portfolioTotalsByCurrency: bucketToMoneyList(roundBucket(portfolioValueByCurrency)),
    concentrations: enriched.map((row) => ({
      ticker: row.entry.ticker,
      ...(row.entry.name !== undefined ? { name: row.entry.name } : {}),
      brokers: [...row.entry.brokers],
      totalQuantity: row.entry.totalQuantity,
      marketValue: bucketToMoneyList(roundBucket(row.entry.amountByCurrency)),
      unrealizedPnL: bucketToMoneyList(roundBucket(row.entry.pnlByCurrency)),
      ...(row.primaryCurrency !== null
        ? {
            primaryCurrency: row.primaryCurrency,
            sharePercent: Math.round(row.share * 10000) / 100,
          }
        : {}),
    })),
    errors,
    ...excludedExtras,
  }
}

function pickPrimaryCurrency(bucket: Record<string, number>): string | null {
  let best: { ccy: string; amount: number } | null = null
  for (const [ccy, amount] of Object.entries(bucket)) {
    if (best === null || amount > best.amount) best = { ccy, amount }
  }
  return best === null ? null : best.ccy
}
