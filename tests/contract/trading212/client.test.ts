import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { Trading212Client } from "../../../src/brokers/trading212/client.js"
import { AuthError, RateLimitError, ValidationError } from "../../../src/utils/errors.js"

const Schema = z.object({ ok: z.boolean() })
const OK_BODY = JSON.stringify({ ok: true })

function res(status: number, body = "", headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers })
}
const isLive = (url: string): boolean => url.includes("live.trading212.com")
const isDemo = (url: string): boolean => url.includes("demo.trading212.com")

function newClient(): Trading212Client {
  return new Trading212Client({ apiKey: "k", apiSecret: "s" })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Trading212Client host auto-detection", () => {
  it("uses the live host when the key works there, without probing demo", async () => {
    const fetchMock = vi.fn((url: string | URL) =>
      Promise.resolve(isLive(String(url)) ? res(200, OK_BODY) : res(401)),
    )
    vi.stubGlobal("fetch", fetchMock)

    expect(await newClient().getJson("/x", Schema)).toEqual({ ok: true })
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.some(isLive)).toBe(true)
    expect(urls.some(isDemo)).toBe(false)
  })

  it("falls back to demo on a 401 from live, then caches demo for later calls", async () => {
    const fetchMock = vi.fn((url: string | URL) =>
      Promise.resolve(isDemo(String(url)) ? res(200, OK_BODY) : res(401)),
    )
    vi.stubGlobal("fetch", fetchMock)

    const client = newClient()
    expect(await client.getJson("/x", Schema)).toEqual({ ok: true })

    // Second call must go straight to demo — no re-probe of live.
    fetchMock.mockClear()
    expect(await client.getJson("/y", Schema)).toEqual({ ok: true })
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.every(isDemo)).toBe(true)
  })

  it("surfaces a 403 scope error from live without falling back to demo", async () => {
    const fetchMock = vi.fn((url: string | URL) =>
      Promise.resolve(isLive(String(url)) ? res(403) : res(200, OK_BODY)),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(newClient().getJson("/x", Schema)).rejects.toBeInstanceOf(AuthError)
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.some(isDemo)).toBe(false)
  })

  it("throws AuthError when the key is unauthorized on both hosts", async () => {
    const seen: string[] = []
    const fetchMock = vi.fn((url: string | URL) => {
      seen.push(String(url))
      return Promise.resolve(res(401))
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(newClient().getJson("/x", Schema)).rejects.toBeInstanceOf(AuthError)
    expect(seen.some(isLive)).toBe(true)
    expect(seen.some(isDemo)).toBe(true)
  })

  it("does not lock onto a host after a 429 — it re-detects on the next call", async () => {
    let phase = 0
    const fetchMock = vi.fn((url: string | URL) => {
      if (phase === 0) return Promise.resolve(res(429, "", { "retry-after": "0" }))
      return Promise.resolve(isDemo(String(url)) ? res(200, OK_BODY) : res(401))
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = newClient()
    await expect(client.getJson("/x", Schema)).rejects.toBeInstanceOf(RateLimitError)

    // A live 429 must not have been cached as "the host"; the next call re-probes
    // (live 401 → demo 200). If 429 had locked live, this would throw AuthError.
    phase = 1
    expect(await client.getJson("/y", Schema)).toEqual({ ok: true })
  })
})

// Schema-mismatch dumps go to stderr, which Claude Desktop persists to a
// plaintext mcp-server-*.log on disk — keep them credential-free and bounded.
describe("Trading212Client schema-mismatch logging", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function stubOkBody(body: unknown) {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(res(200, JSON.stringify(body)))),
    )
    return errSpy
  }

  function loggedText(errSpy: ReturnType<typeof stubOkBody>): string {
    return errSpy.mock.calls.flat().map(String).join(" ")
  }

  it("redacts credential-shaped fields from the mismatch dump", async () => {
    const errSpy = stubOkBody({ apiKey: "t212-LEAK-CANARY", ok: "nope" })

    await expect(newClient().getJson("/x", Schema)).rejects.toBeInstanceOf(ValidationError)

    const logged = loggedText(errSpy)
    expect(logged).toContain("/x")
    expect(logged).not.toContain("t212-LEAK-CANARY")
  })

  it("caps the mismatch dump so full payloads never flood the log", async () => {
    const errSpy = stubOkBody({ ok: "nope", blob: "B".repeat(10_000) })

    await expect(newClient().getJson("/x", Schema)).rejects.toBeInstanceOf(ValidationError)

    const logged = loggedText(errSpy)
    expect(logged).toContain("truncated")
    expect(logged.length).toBeLessThan(2300)
  })
})
