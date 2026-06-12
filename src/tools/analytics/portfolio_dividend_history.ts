import { z } from "zod"

import type { Dividend } from "../../domain/dividend.js"
import type { IBroker } from "../../brokers/base.js"
import type { ToolBinding } from "../../brokers/base.js"
import { list as listBrokers } from "../../brokers/registry.js"
import { parseArgs, safeRun } from "../result.js"

import { addToBucket, bucketToMoneyList, roundBucket } from "./aggregation.js"
import { toBrokerFailure, type BrokerFailure } from "./resilience.js"

const Args = z
  .object({
    groupBy: z.enum(["year", "month", "ticker"]).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    maxPagesPerBroker: z.number().int().min(1).max(20).optional(),
  })
  .strict()

const DEFAULT_PAGE_LIMIT = 50
const DEFAULT_MAX_PAGES = 5

export function createPortfolioDividendHistoryTool(): ToolBinding {
  return {
    tool: {
      name: "portfolio_dividend_history",
      annotations: { title: "Portfolio: Dividend History (All Brokers)", openWorldHint: true },
      description:
        "Aggregates dividend payments across all brokers that support dividends. Groups by year (default), month, or ticker. Each group reports gross/net amounts per currency and the number of payments. Pagination is bounded by maxPagesPerBroker (default 5 pages of 50 = up to 250 dividends per broker).",
      inputSchema: {
        type: "object",
        properties: {
          groupBy: {
            type: "string",
            enum: ["year", "month", "ticker"],
            description: "Grouping key for the aggregation (default 'year').",
          },
          fromDate: {
            type: "string",
            description: "Inclusive lower bound on paidDate (ISO 8601).",
          },
          toDate: {
            type: "string",
            description: "Inclusive upper bound on paidDate (ISO 8601).",
          },
          maxPagesPerBroker: {
            type: "integer",
            minimum: 1,
            maximum: 20,
            description: "Cap on pagination per broker (default 5).",
          },
        },
        additionalProperties: false,
      },
    },
    handler: async (args) => {
      const r = parseArgs(Args, args)
      if (!r.ok) return r.result
      return safeRun(() =>
        buildHistory(
          r.data.groupBy ?? "year",
          r.data.fromDate,
          r.data.toDate,
          r.data.maxPagesPerBroker ?? DEFAULT_MAX_PAGES,
        ),
      )
    },
  }
}

async function buildHistory(
  groupBy: "year" | "month" | "ticker",
  fromDate: string | undefined,
  toDate: string | undefined,
  maxPages: number,
): Promise<unknown> {
  const eligible = listBrokers().filter((b): b is IBroker => b.capabilities.dividends)
  if (eligible.length === 0) {
    return { eligibleBrokers: 0, groups: [], errors: [] }
  }

  const fromMs = fromDate !== undefined ? Date.parse(fromDate) : Number.NEGATIVE_INFINITY
  const toMs = toDate !== undefined ? Date.parse(toDate) : Number.POSITIVE_INFINITY

  const all: Dividend[] = []
  const truncatedBrokers: string[] = []
  const errors: BrokerFailure[] = []

  for (const broker of eligible) {
    try {
      const collected: Dividend[] = []
      let cursor: string | undefined
      let pages = 0
      while (pages < maxPages) {
        const opts =
          cursor !== undefined
            ? { limit: DEFAULT_PAGE_LIMIT, cursor }
            : { limit: DEFAULT_PAGE_LIMIT }
        const page = await broker.getDividends(opts)
        for (const d of page.items) collected.push(d)
        pages++
        if (!page.hasMore || page.nextCursor === undefined) break
        cursor = page.nextCursor
      }
      for (const d of collected) all.push(d)
      if (cursor !== undefined && pages === maxPages) truncatedBrokers.push(broker.id)
    } catch (error) {
      errors.push(toBrokerFailure(broker, error))
    }
  }

  const filtered = all.filter((d) => {
    const ts = Date.parse(d.paidDate)
    if (Number.isNaN(ts)) return false
    return ts >= fromMs && ts <= toMs
  })

  interface Bucket {
    grossByCurrency: Record<string, number>
    netByCurrency: Record<string, number>
    count: number
  }
  const groups = new Map<string, Bucket>()

  for (const d of filtered) {
    const key = bucketKey(d, groupBy)
    let bucket = groups.get(key)
    if (bucket === undefined) {
      bucket = { grossByCurrency: {}, netByCurrency: {}, count: 0 }
      groups.set(key, bucket)
    }
    bucket.grossByCurrency = addToBucket(
      bucket.grossByCurrency,
      d.grossAmount.amount,
      d.grossAmount.currency,
    )
    bucket.netByCurrency = addToBucket(
      bucket.netByCurrency,
      d.netAmount.amount,
      d.netAmount.currency,
    )
    bucket.count += 1
  }

  const sortedGroups = [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([key, bucket]) => ({
      group: key,
      paymentCount: bucket.count,
      gross: bucketToMoneyList(roundBucket(bucket.grossByCurrency)),
      net: bucketToMoneyList(roundBucket(bucket.netByCurrency)),
    }))

  return {
    eligibleBrokers: eligible.length,
    totalDividends: filtered.length,
    rawFetched: all.length,
    truncatedBrokers,
    groupBy,
    groups: sortedGroups,
    errors,
  }
}

function bucketKey(div: Dividend, groupBy: "year" | "month" | "ticker"): string {
  if (groupBy === "ticker") return div.ticker
  const date = new Date(div.paidDate)
  if (Number.isNaN(date.getTime())) return "unknown"
  if (groupBy === "year") return String(date.getUTCFullYear())
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${String(date.getUTCFullYear())}-${m}`
}
