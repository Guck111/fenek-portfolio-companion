import { describe, it, expect } from "vitest"

import { signRequest, mapRetCode } from "../../../src/brokers/bybit/client.js"
import { AuthError, BrokerApiError, RateLimitError } from "../../../src/utils/errors.js"

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
