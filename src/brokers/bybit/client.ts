import { createHmac } from "node:crypto"
import type { z } from "zod"

import { AuthError, BrokerApiError, RateLimitError, ValidationError } from "../../utils/errors.js"
import { withBackoff, type RetryDecision } from "../../utils/ratelimit.js"
import { sanitizeForLog } from "../../utils/redact.js"
import { BybitEnvelope } from "./schemas.js"

const BROKER_ID = "bybit"
const BASE_URL = "https://api.bybit.com" // mainnet only — see design decision 3
const RECV_WINDOW = "5000"
const REQUEST_TIMEOUT_MS = 15_000

export interface BybitClientConfig {
  readonly apiKey: string
  readonly apiSecret: string
}

export interface SignParams {
  readonly apiSecret: string
  readonly timestamp: string
  readonly apiKey: string
  readonly recvWindow: string
  readonly queryString: string
}

// Bybit V5 GET signature: HMAC_SHA256(secret, timestamp + apiKey + recvWindow + queryString).
// queryString must match the string actually sent in the URL, byte for byte.
export function signRequest(p: SignParams): string {
  const payload = p.timestamp + p.apiKey + p.recvWindow + p.queryString
  return createHmac("sha256", p.apiSecret).update(payload).digest("hex")
}

export function mapRetCode(code: number, msg: string, path: string): Error {
  switch (code) {
    case 10003:
    case 10004:
    case 33004:
      return new AuthError(
        `Bybit rejected the API key or signature (retCode ${String(code)})`,
        BROKER_ID,
      )
    case 10005:
      return new AuthError(
        `Bybit API key lacks read permission for ${path} (retCode 10005). Re-create the key with read access to Account/Wallet.`,
        BROKER_ID,
      )
    case 10002:
      return new AuthError(
        `Bybit request expired (retCode 10002). Check that your system clock is accurate.`,
        BROKER_ID,
      )
    case 10006:
    case 10018:
      return new RateLimitError(`Bybit rate limit exceeded (retCode ${String(code)})`, BROKER_ID)
    default:
      return new BrokerApiError(`${msg} (retCode ${String(code)})`, BROKER_ID)
  }
}

function retryDecision(error: unknown): RetryDecision {
  if (error instanceof RateLimitError) return true
  if (error instanceof BrokerApiError && (error.statusCode ?? 0) >= 500) return true
  if (error instanceof TypeError) return true // network failure thrown by fetch
  return false
}

export class BybitClient {
  private readonly apiKey: string
  private readonly apiSecret: string

  constructor(config: BybitClientConfig) {
    if (!config.apiKey || !config.apiSecret) {
      throw new AuthError("Bybit API key and secret are required", BROKER_ID)
    }
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
  }

  async getJson<T>(path: string, query: Record<string, string>, schema: z.ZodType<T>): Promise<T> {
    const queryString = new URLSearchParams(query).toString()
    return withBackoff(async () => {
      const envelope = await this.requestEnvelope(path, queryString)
      if (envelope.retCode !== 0) {
        throw mapRetCode(envelope.retCode, envelope.retMsg, path)
      }
      const parsed = schema.safeParse(envelope.result)
      if (!parsed.success) {
        // Dump the redacted, size-capped result so the real shape lands in the
        // Claude Desktop mcp-server log when our schema drifts. The dump must stay
        // credential-free: /v5/user/query-api echoes the API key itself.
        console.error(
          `[bybit] schema mismatch for ${path}; result (redacted):`,
          sanitizeForLog(envelope.result),
        )
        throw new ValidationError(
          `Bybit response shape mismatch for ${path}: ${parsed.error.message}`,
          { cause: parsed.error },
        )
      }
      return parsed.data
    }, retryDecision)
  }

  private async requestEnvelope(path: string, queryString: string): Promise<BybitEnvelope> {
    const timestamp = Date.now().toString()
    const sign = signRequest({
      apiSecret: this.apiSecret,
      timestamp,
      apiKey: this.apiKey,
      recvWindow: RECV_WINDOW,
      queryString,
    })
    const url = queryString ? `${BASE_URL}${path}?${queryString}` : `${BASE_URL}${path}`
    // X-BAPI-* are custom headers, so fetch would NOT strip them on a cross-origin
    // redirect — refuse redirects outright. No Bybit read endpoint redirects.
    const res = await fetch(url, {
      headers: {
        "X-BAPI-API-KEY": this.apiKey,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": RECV_WINDOW,
        "X-BAPI-SIGN": sign,
      },
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (res.status === 401 || res.status === 403) {
      throw new AuthError("Invalid Bybit credentials", BROKER_ID)
    }
    if (res.status === 429) {
      throw new RateLimitError("Bybit rate limit exceeded", BROKER_ID)
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new BrokerApiError(
        text.length > 0 ? text.slice(0, 200) : res.statusText,
        BROKER_ID,
        res.status,
      )
    }
    const text = await res.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      throw new ValidationError(`Bybit returned non-JSON response for ${path}`)
    }
    const parsed = BybitEnvelope.safeParse(data)
    if (!parsed.success) {
      throw new ValidationError(
        `Bybit envelope shape mismatch for ${path}: ${parsed.error.message}`,
        { cause: parsed.error },
      )
    }
    return parsed.data
  }
}
