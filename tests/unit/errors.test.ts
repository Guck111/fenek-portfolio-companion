import { describe, expect, it } from "vitest"

import {
  AuthError,
  BrokerApiError,
  RateLimitError,
  ValidationError,
  toUserMessage,
} from "../../src/utils/errors.js"

describe("toUserMessage — directive next-action texts", () => {
  it("AuthError names the exact read scopes for Trading 212 and says retrying won't help", () => {
    const msg = toUserMessage(new AuthError("401", "t212"))
    expect(msg).toContain("Trading 212")
    expect(msg).toContain("Portfolio")
    expect(msg.toLowerCase()).toContain("read")
    expect(msg.toLowerCase()).toMatch(/re-?run|retry/)
    expect(msg).not.toContain("Check API key and secret")
  })

  it("AuthError points Bybit users at the read groups and bybit_get_key_info", () => {
    const msg = toUserMessage(new AuthError("403", "bybit"))
    expect(msg).toContain("Bybit")
    expect(msg).toContain("Unified Trading")
    expect(msg).toContain("bybit_get_key_info")
  })

  it("AuthError falls back to generic read-permission guidance for an unknown broker", () => {
    const msg = toUserMessage(new AuthError("401", "etoro"))
    expect(msg.toLowerCase()).toContain("read")
    expect(msg.toLowerCase()).toContain("permission")
  })

  it("RateLimitError tells the assistant not to retry now", () => {
    const msg = toUserMessage(new RateLimitError("429", "bybit"))
    expect(msg.toLowerCase()).toContain("rate-limit")
    expect(msg.toLowerCase()).toMatch(/do not retry|try again/)
  })

  it("RateLimitError surfaces the retry-after hint when present", () => {
    const msg = toUserMessage(new RateLimitError("429", "bybit", 5000))
    expect(msg).toContain("5")
  })

  it("BrokerApiError marks it broker-side and says not to loop", () => {
    const msg = toUserMessage(new BrokerApiError("boom", "bybit", 500))
    expect(msg).toContain("500")
    expect(msg.toLowerCase()).toMatch(/broker'?s side|server-side|broker-side/)
    expect(msg.toLowerCase()).toContain("loop")
  })

  it("ValidationError flags a format change and forbids fabricating values", () => {
    const msg = toUserMessage(new ValidationError("missing field x"))
    expect(msg.toLowerCase()).toContain("unexpected")
    expect(msg.toLowerCase()).toMatch(/fabricate|invent|estimate/)
  })
})
