import { afterEach, describe, it, expect, vi } from "vitest"

import { fetchJson, retryTransient } from "../../../src/brokers/crypto/http.js"
import { BrokerApiError } from "../../../src/utils/errors.js"

describe("retryTransient", () => {
  it("retries on 429 (rate limit) and 5xx", () => {
    expect(retryTransient(new BrokerApiError("x", "crypto", 429))).toBe(true)
    expect(retryTransient(new BrokerApiError("x", "crypto", 500))).toBe(true)
    expect(retryTransient(new BrokerApiError("x", "crypto", 503))).toBe(true)
  })

  it("does not retry other 4xx", () => {
    expect(retryTransient(new BrokerApiError("x", "crypto", 400))).toBe(false)
    expect(retryTransient(new BrokerApiError("x", "crypto", 404))).toBe(false)
  })

  it("does not retry non-broker errors", () => {
    expect(retryTransient(new Error("boom"))).toBe(false)
  })
})

// A hung public endpoint must not wedge the tool call forever — every request
// carries a timeout signal (sequential per-address reads multiply any hang).
describe("fetchJson request hardening", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends requests with a timeout signal, preserving caller init", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response("{}", { status: 200 })))
    vi.stubGlobal("fetch", fetchMock)

    await fetchJson("https://example.invalid/x", "test", { method: "POST", body: "{}" })

    const init = (fetchMock.mock.calls[0] as unknown[])[1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(init.method).toBe("POST")
    expect(init.body).toBe("{}")
  })
})
