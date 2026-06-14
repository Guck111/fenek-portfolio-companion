import { describe, it, expect, vi, beforeEach } from "vitest"

// fetchEvmHoldings goes through fetchJson — mock it so the fan-out can be scripted
// per URL without touching the network.
vi.mock("../../../src/brokers/crypto/http.js", () => ({ fetchJson: vi.fn() }))

import { fetchJson } from "../../../src/brokers/crypto/http.js"
import { fetchEvmHoldings, mapEvmHoldings } from "../../../src/brokers/crypto/chains/evm/read.js"
import { EVM_NETWORKS, type EvmNetwork } from "../../../src/brokers/crypto/chains/evm/networks.js"

const mockedFetch = vi.mocked(fetchJson)

const ARBITRUM: EvmNetwork = {
  id: "arbitrum",
  blockscoutBase: "https://arbitrum.blockscout.com",
  nativeSymbol: "ETH",
  nativeCoinId: "coingecko:ethereum",
  llamaChain: "arbitrum",
}

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
const erc20 = (
  over: Partial<{ address_hash: string; symbol: string; decimals: string; type: string }>,
) => ({
  token: {
    address_hash: over.address_hash ?? USDC,
    symbol: over.symbol ?? "USDC",
    decimals: over.decimals ?? "6",
    type: over.type ?? "ERC-20",
  },
  value: "2500000",
})

describe("mapEvmHoldings", () => {
  it("maps the native wei balance (18 decimals) to a native holding", () => {
    const holdings = mapEvmHoldings(ARBITRUM, "1500000000000000000", [])
    expect(holdings).toEqual([
      { chain: "arbitrum", symbol: "ETH", amount: 1.5, coinId: "coingecko:ethereum" },
    ])
  })

  it("omits the native holding when the balance is zero or null", () => {
    expect(mapEvmHoldings(ARBITRUM, "0", [])).toEqual([])
    expect(mapEvmHoldings(ARBITRUM, null, [])).toEqual([])
  })

  it("maps an ERC-20 to a holding with a lowercase per-chain DefiLlama coinId", () => {
    const holdings = mapEvmHoldings(ARBITRUM, null, [erc20({})])
    expect(holdings).toEqual([
      {
        chain: "arbitrum",
        symbol: "USDC",
        amount: 2.5,
        coinId: `arbitrum:${USDC.toLowerCase()}`,
      },
    ])
  })

  it("filters out ERC-721 / ERC-1155 entries (only ERC-20 is in scope)", () => {
    const holdings = mapEvmHoldings(ARBITRUM, null, [
      erc20({ type: "ERC-721" }),
      erc20({ type: "ERC-1155" }),
    ])
    expect(holdings).toEqual([])
  })

  it("drops zero-balance tokens", () => {
    const zero = {
      token: { address_hash: USDC, symbol: "USDC", decimals: "6", type: "ERC-20" },
      value: "0",
    }
    expect(mapEvmHoldings(ARBITRUM, null, [zero])).toEqual([])
  })

  it("sanitizes attacker-controlled token symbols, falling back to a short address", () => {
    const evil = erc20({
      symbol: "‮USDC",
      address_hash: "0xABCDEF0000000000000000000000000000000000",
    })
    const [holding] = mapEvmHoldings(ARBITRUM, null, [evil])
    expect(holding?.symbol).toBe("USDC") // bidi control stripped
  })

  it("drops tokens whose raw value is not a base-10 integer (untrusted upstream)", () => {
    // bare Number() would coerce "0x10"→16 and "1e30"→1e30 into a wrong balance.
    expect(
      mapEvmHoldings(ARBITRUM, null, [erc20({ symbol: "A" })] /* sanity: real maps */),
    ).toHaveLength(1)
    const hex = {
      token: { address_hash: USDC, symbol: "A", decimals: "6", type: "ERC-20" },
      value: "0x10",
    }
    const sci = {
      token: { address_hash: USDC, symbol: "A", decimals: "6", type: "ERC-20" },
      value: "1e30",
    }
    expect(mapEvmHoldings(ARBITRUM, null, [hex])).toEqual([])
    expect(mapEvmHoldings(ARBITRUM, null, [sci])).toEqual([])
  })

  it("drops a native balance that is not a base-10 integer", () => {
    expect(mapEvmHoldings(ARBITRUM, "1e30", [])).toEqual([])
    expect(mapEvmHoldings(ARBITRUM, "0xff", [])).toEqual([])
  })

  it("falls back to the default decimals when decimals is out-of-range or non-numeric", () => {
    // decimals "999" would make 10^999 = Infinity → amount 0 (silently dropped);
    // bounded parsing falls back to 18 so a real 1e18 balance reads as 1.0.
    const t = {
      token: { address_hash: USDC, symbol: "A", decimals: "999", type: "ERC-20" },
      value: "1000000000000000000",
    }
    const [h] = mapEvmHoldings(ARBITRUM, null, [t])
    expect(h?.amount).toBe(1)
  })
})

describe("fetchEvmHoldings", () => {
  beforeEach(() => {
    mockedFetch.mockReset()
  })

  const native = (): unknown => ({ coin_balance: "1000000000000000000" })
  const tokens = (): unknown => [
    {
      token: { address_hash: USDC, symbol: "USDC", decimals: "6", type: "ERC-20" },
      value: "1000000",
    },
  ]

  it("fans out across every EVM network and aggregates their holdings", async () => {
    mockedFetch.mockImplementation((url: string) =>
      Promise.resolve(url.includes("/token-balances") ? tokens() : native()),
    )
    const holdings = await fetchEvmHoldings(USDC)
    // 5 networks × (1 native + 1 token) = 10 holdings; chains span the family.
    expect(holdings).toHaveLength(EVM_NETWORKS.length * 2)
    const chains = new Set(holdings.map((h) => h.chain))
    expect(chains.has("ethereum")).toBe(true)
    expect(chains.has("polygon")).toBe(true)
  })

  it("isolates a single failing network — the others still report", async () => {
    mockedFetch.mockImplementation((url: string) => {
      if (url.includes("polygon.blockscout.com")) return Promise.reject(new Error("down"))
      return Promise.resolve(url.includes("/token-balances") ? tokens() : native())
    })
    const holdings = await fetchEvmHoldings(USDC)
    expect(holdings.some((h) => h.chain === "polygon")).toBe(false)
    expect(holdings.some((h) => h.chain === "ethereum")).toBe(true)
    expect(holdings).toHaveLength((EVM_NETWORKS.length - 1) * 2)
  })

  it("keeps the native balance when only the token-balances endpoint fails", async () => {
    // A token-endpoint hiccup must not discard an already-fetched native balance.
    mockedFetch.mockImplementation((url: string) => {
      if (url.includes("/token-balances")) return Promise.reject(new Error("token endpoint down"))
      return Promise.resolve(native())
    })
    const holdings = await fetchEvmHoldings(USDC)
    expect(holdings).toHaveLength(EVM_NETWORKS.length) // one native per network, tokens dropped
    expect(holdings.every((h) => h.symbol === "ETH" || h.symbol === "POL")).toBe(true)
  })

  it("keeps tokens when only the native-balance endpoint fails", async () => {
    mockedFetch.mockImplementation((url: string) => {
      if (url.includes("/token-balances")) return Promise.resolve(tokens())
      return Promise.reject(new Error("address endpoint down"))
    })
    const holdings = await fetchEvmHoldings(USDC)
    expect(holdings).toHaveLength(EVM_NETWORKS.length) // one token per network, no native
    expect(holdings.every((h) => h.symbol === "USDC")).toBe(true)
  })

  it("treats a network as failed only when BOTH of its endpoints fail", async () => {
    mockedFetch.mockImplementation((url: string) => {
      if (url.includes("polygon.blockscout.com")) return Promise.reject(new Error("down"))
      return Promise.resolve(url.includes("/token-balances") ? tokens() : native())
    })
    const holdings = await fetchEvmHoldings(USDC)
    expect(holdings.some((h) => h.chain === "polygon")).toBe(false)
    expect(holdings).toHaveLength((EVM_NETWORKS.length - 1) * 2)
  })

  it("throws only when every network is unreachable (so the address is marked failed)", async () => {
    mockedFetch.mockImplementation(() => Promise.reject(new Error("down")))
    await expect(fetchEvmHoldings(USDC)).rejects.toThrow()
  })
})

describe("EVM_NETWORKS table", () => {
  it("registers the five v1 networks", () => {
    expect(EVM_NETWORKS.map((n) => n.id)).toEqual([
      "ethereum",
      "arbitrum",
      "optimism",
      "base",
      "polygon",
    ])
  })

  it("pins Optimism to its canonical host and Polygon to the POL price id", () => {
    const optimism = EVM_NETWORKS.find((n) => n.id === "optimism")
    const polygon = EVM_NETWORKS.find((n) => n.id === "polygon")
    expect(optimism?.blockscoutBase).toBe("https://explorer.optimism.io")
    expect(polygon?.nativeCoinId).toBe("coingecko:polygon-ecosystem-token")
  })
})
