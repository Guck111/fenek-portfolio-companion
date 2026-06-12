import { z } from "zod"

import type { IBroker } from "../../brokers/base.js"
import type { ToolBinding } from "../../brokers/base.js"
import { list as listBrokers } from "../../brokers/registry.js"
import { partitionBrokersByTier } from "../../license/gate.js"
import { AGGREGATE_EXCLUDED_NOTE } from "../../license/texts.js"
import { parseArgs, safeRun } from "../result.js"

import { toBrokerFailure, type BrokerFailure } from "./resilience.js"

const Args = z.object({}).strict()

export function createPortfolioPieOverlapTool(): ToolBinding {
  return {
    tool: {
      name: "portfolio_pie_overlap",
      annotations: { title: "Portfolio: Pie Overlap (Shared Tickers)", openWorldHint: true },
      description:
        "For brokers that support pies, finds tickers that appear in more than one pie. Lists each duplicated ticker with the pies that hold it, the target weight inside each pie, and the broker. Useful for spotting unintended overlap when you build several themed pies that share core ETFs.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    handler: async (args) => {
      const r = parseArgs(Args, args)
      if (!r.ok) return r.result
      return safeRun(() => buildOverlap())
    },
  }
}

interface PieMembership {
  readonly brokerId: string
  readonly brokerName: string
  readonly pieId: string
  readonly pieName: string
  readonly targetWeight: number
  readonly currentWeight: number
  readonly quantity: number
}

async function buildOverlap(): Promise<unknown> {
  const { visible, excludedSources } = partitionBrokersByTier(listBrokers())
  const excludedExtras =
    excludedSources.length > 0 ? { excludedSources, note: AGGREGATE_EXCLUDED_NOTE } : {}
  const eligibleBrokers = visible.filter(
    (b): b is IBroker & Required<Pick<IBroker, "getPies" | "getPie">> =>
      b.capabilities.pies && b.getPies !== undefined && b.getPie !== undefined,
  )

  if (eligibleBrokers.length === 0) {
    return { eligibleBrokers: 0, overlappingTickers: [], errors: [], ...excludedExtras }
  }

  const memberships = new Map<string, PieMembership[]>()
  const errors: BrokerFailure[] = []

  for (const broker of eligibleBrokers) {
    try {
      const pies = await broker.getPies()
      for (const pie of pies) {
        const detail = await broker.getPie(pie.id)
        for (const slice of detail.slices) {
          const list = memberships.get(slice.ticker) ?? []
          list.push({
            brokerId: broker.id,
            brokerName: broker.name,
            pieId: detail.id,
            pieName: detail.name,
            targetWeight: slice.targetWeight,
            currentWeight: slice.currentWeight,
            quantity: slice.quantity,
          })
          memberships.set(slice.ticker, list)
        }
      }
    } catch (error) {
      errors.push(toBrokerFailure(broker, error))
    }
  }

  const overlapping = [...memberships.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([ticker, list]) => ({
      ticker,
      pieCount: list.length,
      totalTargetWeightAcrossPies: list.reduce((acc, m) => acc + m.targetWeight, 0),
      memberships: list,
    }))
    .sort((a, b) => b.pieCount - a.pieCount)

  return {
    eligibleBrokers: eligibleBrokers.length,
    overlappingTickers: overlapping,
    errors,
    ...excludedExtras,
  }
}
