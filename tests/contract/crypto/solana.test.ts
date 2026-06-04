import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import { mapSolanaAssets } from "../../../src/brokers/crypto/chains/solana.js"
import { HeliusRpcResponse } from "../../../src/brokers/crypto/schemas.js"

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/crypto",
)

describe("solana holdings mapper", () => {
  it("maps Helius assets to RawHolding[] with native SOL included", () => {
    const raw = HeliusRpcResponse.parse(
      JSON.parse(fs.readFileSync(path.join(fixtureDir, "helius/get_assets_by_owner.json"), "utf8")),
    )
    const holdings = mapSolanaAssets(raw.result)
    const sol = holdings.find((h) => h.symbol === "SOL")
    expect(sol).toBeDefined()
    expect(sol?.coinId).toBe("coingecko:solana")
    for (const h of holdings) {
      expect(h.amount).toBeGreaterThan(0)
      expect(h.chain).toBe("solana")
    }
  })
})
