import { z } from "zod"

import type { ToolBinding } from "../../brokers/base.js"
import { list as listBrokers } from "../../brokers/registry.js"
import type { Account } from "../../domain/account.js"
import type { OffAccountBalances } from "../../domain/balances.js"
import type { DerivativePosition } from "../../domain/derivative.js"
import type { EarnPosition } from "../../domain/earn.js"
import type { Position } from "../../domain/position.js"
import { partitionBrokersByTier } from "../../license/gate.js"
import { AGGREGATE_EXCLUDED_NOTE } from "../../license/texts.js"
import { parseArgs, safeRun } from "../result.js"

import { addMoney, bucketToMoneyList, roundBucket, type MoneyByCurrency } from "./aggregation.js"
import { collectBroker, type BrokerFailure } from "./resilience.js"

const Args = z.object({}).strict()

interface BucketFailure {
  readonly source: string
  readonly message: string
}

interface SnapshotSource {
  readonly id: string
  readonly name: string
  readonly status: "ok" | "empty" | "error"
  readonly account?: Account
  readonly positions: readonly Position[]
  readonly earn?: readonly EarnPosition[]
  readonly derivatives?: readonly DerivativePosition[]
  readonly offAccount?: OffAccountBalances
  readonly failures: readonly BucketFailure[]
  readonly error?: string
}

export function createPortfolioSnapshotTool(): ToolBinding {
  return {
    tool: {
      name: "portfolio_snapshot",
      annotations: { title: "Portfolio: Full Snapshot (All Sources)", openWorldHint: true },
      description:
        'One call that reads EVERY configured source and ALL its money buckets: full position lists plus, where a source has them, Earn/staked balances, open derivatives, and off-account holdings (e.g. an exchange Funding wallet). Use this for broad requests like "show my whole portfolio / all my assets / net worth" so no configured source is missed. Each source carries a status (ok / empty / error) and per-bucket failures, so a partial read is never mistaken for a complete one. `totals.marketValue` sums position market value per currency (no FX conversion); Earn/derivatives/off-account holdings are listed in their own sections and NOT folded into totals (their amounts are coin counts or settle-coin values, not directly summable). Crypto sources require Fenek Pro and are listed under `excludedSources` on the free tier.',
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    handler: async (args) => {
      const r = parseArgs(Args, args)
      if (!r.ok) return r.result
      return safeRun(() => buildSnapshot())
    },
  }
}

// Runs an optional money-bucket reporter that returns {positions, failures}.
// Sub-source failures are folded into `sink`; a whole-bucket throw becomes one
// `sink` entry labeled with the bucket, and the bucket contributes no positions.
async function collectBucket<T>(
  label: string,
  call: () => Promise<{
    readonly positions: readonly T[]
    readonly failures: readonly BucketFailure[]
  }>,
  sink: BucketFailure[],
): Promise<readonly T[]> {
  try {
    const report = await call()
    sink.push(...report.failures)
    return report.positions
  } catch (error) {
    sink.push({ source: label, message: error instanceof Error ? error.message : String(error) })
    return []
  }
}

async function buildSnapshot(): Promise<unknown> {
  const { visible, excludedSources } = partitionBrokersByTier(listBrokers())
  const excludedExtras =
    excludedSources.length > 0 ? { excludedSources, note: AGGREGATE_EXCLUDED_NOTE } : {}

  const sources: SnapshotSource[] = []
  let value: MoneyByCurrency = {}

  for (const broker of visible) {
    const positionFailures: BrokerFailure[] = []
    const positions = await collectBroker(broker, () => broker.getPositions(), positionFailures)
    if (positions === undefined) {
      sources.push({
        id: broker.id,
        name: broker.name,
        status: "error",
        positions: [],
        failures: [],
        error: positionFailures[0]?.error ?? "failed to read positions",
      })
      continue
    }

    const failures: BucketFailure[] = []

    let account: Account | null = null
    try {
      account = await broker.getAccount()
    } catch (error) {
      account = null
      failures.push({
        source: "account",
        message: error instanceof Error ? error.message : String(error),
      })
    }

    let earn: readonly EarnPosition[] | undefined
    const getEarn = broker.getEarnReport?.bind(broker)
    if (getEarn !== undefined) {
      earn = await collectBucket("earn", getEarn, failures)
    }

    let derivatives: readonly DerivativePosition[] | undefined
    const getDerivatives = broker.getDerivativeReport?.bind(broker)
    if (getDerivatives !== undefined) {
      derivatives = await collectBucket("derivatives", getDerivatives, failures)
    }

    let offAccount: OffAccountBalances | undefined
    const getOffAccount = broker.getOffAccountBalances?.bind(broker)
    if (getOffAccount !== undefined) {
      try {
        offAccount = await getOffAccount()
      } catch (error) {
        failures.push({
          source: "off-account",
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    for (const p of positions) value = addMoney(value, p.marketValue)

    const hasData =
      positions.length > 0 ||
      (earn?.length ?? 0) > 0 ||
      (derivatives?.length ?? 0) > 0 ||
      (offAccount !== undefined &&
        (offAccount.coins.length > 0 || offAccount.totalValue !== undefined)) ||
      (account !== null && account.totalValue.amount !== 0)

    // A bucket/account read that FAILED leaves the source's true holdings
    // unknown — never label that "empty" (it would read as "this source holds
    // nothing", silently dropping a money bucket whose read was denied).
    const status = hasData ? "ok" : failures.length > 0 ? "error" : "empty"

    sources.push({
      id: broker.id,
      name: broker.name,
      status,
      ...(account !== null ? { account } : {}),
      positions,
      ...(earn !== undefined ? { earn } : {}),
      ...(derivatives !== undefined ? { derivatives } : {}),
      ...(offAccount !== undefined ? { offAccount } : {}),
      failures,
    })
  }

  return {
    sources,
    totals: { marketValue: bucketToMoneyList(roundBucket(value)) },
    ...excludedExtras,
  }
}
