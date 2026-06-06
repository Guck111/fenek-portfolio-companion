import { describe, it, expect } from "vitest"

import { retryTransient } from "../../../src/brokers/crypto/http.js"
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
