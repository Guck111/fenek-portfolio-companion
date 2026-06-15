import { describe, expect, it } from "vitest"

import { CryptoBroker } from "../../src/brokers/crypto/index.js"

// Live schema-drift detection for the keyless on-chain wallets broker. Unlike
// the mocked e2e suite, this hits the REAL provider APIs (Blockscout per EVM
// network, Solana RPC, TON, DefiLlama pricing) to catch the one thing mocks
// can't: a provider changing its response shape so our zod schemas no longer
// parse it.
//
// Gated hard: runs ONLY when FENEK_LIVE=1 AND WALLET_ADDRESSES are present, so
// it never executes in the default suite, `preversion`, or PR CI — even if a
// developer happens to have WALLET_ADDRESSES set for the real server. Addresses
// come from env/secrets exclusively and are never committed to the repo.
//
// Run locally:   npm run test:live          (with WALLET_ADDRESSES exported)
// Run in CI:     .github/workflows/live.yml  (manual / nightly, secret-backed)
const RAW_ADDRESSES = process.env["WALLET_ADDRESSES"]?.trim() ?? ""
const LIVE_ENABLED = process.env["FENEK_LIVE"] === "1" && RAW_ADDRESSES.length > 0

describe.skipIf(!LIVE_ENABLED)("live: crypto wallets schema drift", () => {
  it("reads every configured wallet without detection, schema, or network failures", async () => {
    const broker = new CryptoBroker()
    await broker.authenticate({ credentials: { WALLET_ADDRESSES: RAW_ADDRESSES } })
    const report = await broker.getReport()

    // Detection must still classify every configured address — a non-empty
    // bucket here means an address format/checksum regression.
    expect(report.unrecognized).toEqual([])
    expect(report.unsupported).toEqual([])
    // A non-empty `failed` means a chain read threw — most likely a provider
    // response-shape change our zod schema no longer accepts (or a transient
    // provider outage; re-run to disambiguate).
    expect(report.failed).toEqual([])

    // Every priced holding that does come back must carry the normalized shape.
    for (const position of report.positions) {
      expect(position.brokerId).toBe("crypto")
      expect(position.currency).toBe("USD")
      expect(Number.isFinite(position.quantity)).toBe(true)
      expect(Number.isFinite(position.marketValue.amount)).toBe(true)
    }
    // Generous timeout: readHoldings reads chains/addresses sequentially and
    // each fetch can retry on a 429/5xx (15s/attempt), so a single slow public
    // endpoint must not tip a multi-wallet drift run into a false failure.
  }, 120_000)
})
