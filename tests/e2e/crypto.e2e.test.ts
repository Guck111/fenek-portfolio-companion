import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CryptoBroker } from "../../src/brokers/crypto/index.js"
import { createCryptoTools } from "../../src/brokers/crypto/tools.js"
import { clear, register } from "../../src/brokers/registry.js"
import { _resetLicensingForTests, initLicensing } from "../../src/license/manager.js"
import {
  connectE2EClient,
  installFetchRouter,
  loadFixture,
  useHermeticStateDir,
} from "../helpers/e2e.js"
import { parseToolResult } from "../helpers/fake-broker.js"

// The Bitcoin genesis address — a public, well-known constant (not anyone's
// personal wallet), already used as a fixture/detection sample. Routes to the
// keyless Esplora reader, the tightest single-call crypto path.
const BTC_GENESIS = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"

// End-to-end across the real MCP boundary for the keyless on-chain wallets
// broker (Pro-tier). Happy path drives one chain through stubbed fetch; the
// error path is the license gate, since per-address HTTP failures are isolated
// to empty results rather than surfaced as tool errors.
describe("e2e: Crypto wallets over the MCP tool boundary", () => {
  let restoreStateDir: () => void

  beforeEach(() => {
    restoreStateDir = useHermeticStateDir()
    clear()
    _resetLicensingForTests()
  })

  afterEach(() => {
    clear()
    _resetLicensingForTests()
    vi.unstubAllGlobals()
    restoreStateDir()
  })

  async function registerCrypto(addresses: string): Promise<void> {
    const broker = new CryptoBroker()
    await broker.authenticate({ credentials: { WALLET_ADDRESSES: addresses } })
    register(broker, createCryptoTools(broker))
  }

  it("returns a normalized priced position for crypto_get_positions", async () => {
    // The Esplora balance (confirmed + mempool, funded − spent) is 1.234 BTC;
    // priced at 50000 USD → 61700 USD market value.
    installFetchRouter([
      { when: "mempool.space", json: loadFixture("crypto/esplora/address.json") },
      {
        when: "coins.llama.fi",
        json: {
          coins: {
            "coingecko:bitcoin": {
              decimals: 8,
              symbol: "BTC",
              price: 50000,
              timestamp: 1717084800,
              confidence: 0.99,
            },
          },
        },
      },
    ])
    await registerCrypto(BTC_GENESIS)
    const harness = await connectE2EClient()
    try {
      const res = (await harness.client.callTool({
        name: "crypto_get_positions",
        arguments: {},
      })) as CallToolResult
      expect(res.isError).toBeFalsy()
      // crypto_get_positions returns the full report: priced holdings plus
      // per-address diagnostics (none skipped here).
      expect(parseToolResult(res)).toEqual({
        positions: [
          {
            brokerId: "crypto",
            ticker: "BTC",
            name: "BTC (bitcoin)",
            currency: "USD",
            quantity: 1.234,
            currentPrice: { amount: 50000, currency: "USD" },
            marketValue: { amount: 61700, currency: "USD" },
          },
        ],
        unrecognized: [],
        unsupported: [],
        failed: [],
      })
    } finally {
      await harness.close()
    }
  })

  it("denies the Pro tool with a directive license error when the paywall is armed", async () => {
    // No routes: the gate must deny BEFORE the handler runs, so no HTTP happens.
    // An empty router makes any stray request fail loudly rather than hit the network.
    installFetchRouter([])
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: undefined,
      provider: null,
    })
    await registerCrypto(BTC_GENESIS)
    const harness = await connectE2EClient()
    try {
      const res = (await harness.client.callTool({
        name: "crypto_get_positions",
        arguments: {},
      })) as CallToolResult
      expect(res.isError).toBe(true)
      const first = res.content[0]
      const text = first?.type === "text" ? first.text : ""
      expect(text).toContain("Fenek Pro")
      expect(text).toContain("No license key is configured")
    } finally {
      await harness.close()
    }
  })
})
