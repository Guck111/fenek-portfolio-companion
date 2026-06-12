import { afterEach, describe, it, expect, vi } from "vitest"
import { z } from "zod"

import { BybitClient, signRequest, mapRetCode } from "../../../src/brokers/bybit/client.js"
import { BybitApiKeyInfo } from "../../../src/brokers/bybit/schemas.js"
import {
  AuthError,
  BrokerApiError,
  RateLimitError,
  ValidationError,
} from "../../../src/utils/errors.js"

describe("bybit signRequest", () => {
  it("produces the V5 HMAC-SHA256 hex for a known vector", () => {
    const sign = signRequest({
      apiSecret: "testsecret",
      timestamp: "1700000000000",
      apiKey: "testkey",
      recvWindow: "5000",
      queryString: "accountType=UNIFIED",
    })
    expect(sign).toBe("6ae139d80e1d2c505dcd529e73e2c6783ff785cc2fe3984d9029213334721a1a")
  })

  it("is order-sensitive: a different queryString yields a different signature", () => {
    const base = {
      apiSecret: "s",
      timestamp: "1",
      apiKey: "k",
      recvWindow: "5000",
      queryString: "a=1",
    }
    expect(signRequest(base)).not.toBe(signRequest({ ...base, queryString: "a=2" }))
  })
})

describe("bybit mapRetCode", () => {
  it("maps auth/sign/expiry codes to AuthError", () => {
    expect(mapRetCode(10003, "x", "/p")).toBeInstanceOf(AuthError)
    expect(mapRetCode(10004, "x", "/p")).toBeInstanceOf(AuthError)
    expect(mapRetCode(33004, "x", "/p")).toBeInstanceOf(AuthError)
    expect(mapRetCode(10005, "x", "/p")).toBeInstanceOf(AuthError)
    expect(mapRetCode(10002, "x", "/p")).toBeInstanceOf(AuthError)
  })

  it("maps rate-limit codes to RateLimitError", () => {
    expect(mapRetCode(10006, "x", "/p")).toBeInstanceOf(RateLimitError)
    expect(mapRetCode(10018, "x", "/p")).toBeInstanceOf(RateLimitError)
  })

  it("maps unknown codes to BrokerApiError with the message", () => {
    const err = mapRetCode(99999, "boom", "/p")
    expect(err).toBeInstanceOf(BrokerApiError)
    expect(err.message).toContain("boom")
  })
})

// The API key and signature ride in custom X-BAPI-* headers, which fetch does NOT
// strip on cross-origin redirects — redirects must fail hard. A hung provider must
// not wedge the tool call forever either.
describe("BybitClient request hardening", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends every request with redirects disabled and a timeout signal", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ retCode: 0, retMsg: "OK", result: { ok: true } }), {
          status: 200,
        }),
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const Schema = z.object({ ok: z.boolean() })
    await new BybitClient({ apiKey: "k", apiSecret: "s" }).getJson("/v5/x", {}, Schema)

    expect(fetchMock.mock.calls.length).toBeGreaterThan(0)
    for (const call of fetchMock.mock.calls) {
      const init = (call as unknown[])[1] as RequestInit
      expect(init.redirect).toBe("error")
      expect(init.signal).toBeInstanceOf(AbortSignal)
    }
  })
})

// Schema-mismatch dumps go to stderr, which Claude Desktop persists to a
// plaintext mcp-server-*.log on disk — credential values must never appear there.
describe("BybitClient schema-mismatch logging", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function stubMismatch(result: unknown) {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ retCode: 0, retMsg: "OK", result }), { status: 200 }),
        ),
      ),
    )
    return errSpy
  }

  function loggedText(errSpy: ReturnType<typeof stubMismatch>): string {
    return errSpy.mock.calls.flat().map(String).join(" ")
  }

  function newClient(): BybitClient {
    return new BybitClient({ apiKey: "k", apiSecret: "s" })
  }

  it("redacts credential fields from the /v5/user/query-api mismatch dump", async () => {
    // /v5/user/query-api echoes the API key itself; ips and note are also
    // key-scoped metadata. None of these values may reach the log.
    const errSpy = stubMismatch({
      apiKey: "key-LEAK-CANARY",
      secret: "secret-LEAK-CANARY",
      ips: ["203.0.113.7"],
      note: "note-LEAK-CANARY",
      readOnly: "drifted", // schema expects a number → forces the mismatch path
      info: { apiKey: "nested-LEAK-CANARY" },
    })

    const error: unknown = await newClient()
      .getJson("/v5/user/query-api", {}, BybitApiKeyInfo)
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ValidationError)

    const logged = loggedText(errSpy)
    expect(logged).toContain("/v5/user/query-api")
    expect(logged).toContain('"readOnly":"drifted"') // shape stays diagnosable
    for (const canary of [
      "key-LEAK-CANARY",
      "secret-LEAK-CANARY",
      "203.0.113.7",
      "note-LEAK-CANARY",
      "nested-LEAK-CANARY",
    ]) {
      expect(logged).not.toContain(canary)
      expect(String(error)).not.toContain(canary)
    }
  })

  it("caps the mismatch dump so full payloads never flood the log", async () => {
    const errSpy = stubMismatch({ ok: "nope", blob: "B".repeat(10_000) })
    const Schema = z.object({ ok: z.boolean() })

    await expect(
      newClient().getJson("/v5/account/wallet-balance", {}, Schema),
    ).rejects.toBeInstanceOf(ValidationError)

    const logged = loggedText(errSpy)
    expect(logged).toContain("truncated")
    expect(logged.length).toBeLessThan(2300)
  })

  it("still reports a mismatch when the envelope has no result at all", async () => {
    const errSpy = stubMismatch(undefined)

    await expect(
      newClient().getJson("/v5/user/query-api", {}, BybitApiKeyInfo),
    ).rejects.toBeInstanceOf(ValidationError)
    expect(loggedText(errSpy)).toContain("/v5/user/query-api")
  })
})
