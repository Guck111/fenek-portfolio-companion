import type { IBroker } from "../brokers/base.js"

import { getTier } from "./manager.js"

export interface ExcludedSource {
  readonly broker: string
  readonly name: string
  readonly reason: "pro-license-required"
}

// Cross-broker analytics stay free forever, but on the free tier they only
// aggregate free sources; Pro sources are listed explicitly instead of being
// silently summed or silently dropped.
export function partitionBrokersByTier(brokers: readonly IBroker[]): {
  readonly visible: readonly IBroker[]
  readonly excludedSources: readonly ExcludedSource[]
} {
  if (getTier() === "pro") return { visible: brokers, excludedSources: [] }
  const visible: IBroker[] = []
  const excludedSources: ExcludedSource[] = []
  for (const broker of brokers) {
    // Absent tier = free; same default as the per-tool gate in brokers/registry.ts.
    if ((broker.tier ?? "free") === "pro") {
      excludedSources.push({ broker: broker.id, name: broker.name, reason: "pro-license-required" })
    } else {
      visible.push(broker)
    }
  }
  return { visible, excludedSources }
}
