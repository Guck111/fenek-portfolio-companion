import type { z } from "zod"

import { AuthError, BrokerApiError, RateLimitError, ValidationError } from "../../utils/errors.js"
import { sanitizeForLog } from "../../utils/redact.js"

const BROKER_ID = "t212"

export interface T212ClientConfig {
  readonly apiKey: string
  readonly apiSecret: string
}

const LIVE_BASE_URL = "https://live.trading212.com/api/v0"
const DEMO_BASE_URL = "https://demo.trading212.com/api/v0"
// A T212 API key is bound to one environment, so we don't ask the user which —
// we probe `live` first (most users want their real account) and fall back to
// `demo` only when `live` reports the key is unrecognized (401). See request().
const CANDIDATE_BASE_URLS = [LIVE_BASE_URL, DEMO_BASE_URL] as const

const MAX_RETRIES = 2
const NETWORK_BACKOFF_BASE_MS = 500
const REQUEST_TIMEOUT_MS = 15_000
// Retry-After is provider-controlled; honor it only up to a sane bound so a
// header like "86400" can't put the tool call to sleep for a day.
const MAX_RETRY_AFTER_MS = 60_000

export class Trading212Client {
  private readonly authHeader: string
  // Resolved on the first request (live vs demo), then cached for the process.
  private baseUrl: string | null = null

  constructor(config: T212ClientConfig) {
    if (!config.apiKey || !config.apiSecret) {
      throw new AuthError("T212 API key and secret are required", BROKER_ID)
    }
    const credentials = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64")
    this.authHeader = `Basic ${credentials}`
  }

  async getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const res = await this.request(path)

    if (res.status === 401) {
      throw new AuthError("Invalid Trading 212 credentials", BROKER_ID)
    }
    if (res.status === 403) {
      throw new AuthError(
        `Trading 212 API key lacks permission for ${path}. Re-create the key in Trading 212 with the required scope enabled.`,
        BROKER_ID,
      )
    }
    if (res.status === 429) {
      const retryAfterMs = parseRetryAfter(res)
      throw new RateLimitError("Trading 212 rate limit exceeded", BROKER_ID, retryAfterMs)
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
      throw new ValidationError(`Trading 212 returned non-JSON response for ${path}`)
    }

    const parsed = schema.safeParse(data)
    if (!parsed.success) {
      // Log the redacted, size-capped response so the actual T212 shape ends up
      // in Claude Desktop's mcp-server-*.log when our schema drifts. Helps update
      // schemas without re-running discovery scripts.
      console.error(
        `[t212] schema mismatch for ${path}; response (redacted):`,
        sanitizeForLog(data),
      )
      throw new ValidationError(
        `Trading 212 response shape mismatch for ${path}: ${parsed.error.message}`,
        { cause: parsed.error },
      )
    }
    return parsed.data
  }

  // Resolves the environment host on first use. Falls back to the next candidate
  // only on a 401 (key not recognized there); locks onto the first host that
  // authenticates the key (2xx) or recognizes it but lacks scope (403). A 429 /
  // 5xx / network error is inconclusive — it is surfaced without locking, so the
  // host is re-detected next time rather than pinned to the wrong environment.
  private async request(path: string): Promise<Response> {
    if (this.baseUrl !== null) {
      return this.fetchWithRetry(this.baseUrl, path)
    }
    let lastUnauthorized: Response | undefined
    for (const candidate of CANDIDATE_BASE_URLS) {
      const res = await this.fetchWithRetry(candidate, path)
      if (res.status === 401) {
        lastUnauthorized = res
        continue
      }
      if (res.ok || res.status === 403) {
        this.baseUrl = candidate
      }
      return res
    }
    // Every candidate returned 401 — surface the auth failure (getJson maps it).
    if (lastUnauthorized !== undefined) return lastUnauthorized
    throw new AuthError("Invalid Trading 212 credentials", BROKER_ID)
  }

  private async fetchWithRetry(baseUrl: string, path: string): Promise<Response> {
    const url = `${baseUrl}${path}`
    let lastNetworkError: unknown

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Refuse redirects: auth rides in a header and no T212 endpoint redirects;
        // time out hung requests so a stalled provider can't wedge the tool call.
        const res = await fetch(url, {
          headers: { Authorization: this.authHeader },
          redirect: "error",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
        if (res.status === 429 && attempt < MAX_RETRIES) {
          const waitMs = parseRetryAfter(res) ?? NETWORK_BACKOFF_BASE_MS * Math.pow(2, attempt)
          await sleep(waitMs)
          continue
        }
        return res
      } catch (error) {
        lastNetworkError = error
        if (attempt === MAX_RETRIES) break
        await sleep(NETWORK_BACKOFF_BASE_MS * Math.pow(2, attempt))
      }
    }

    const message = lastNetworkError instanceof Error ? lastNetworkError.message : "Network error"
    throw new BrokerApiError(message, BROKER_ID)
  }
}

function parseRetryAfter(res: Response): number | undefined {
  const header = res.headers.get("retry-after")
  if (header === null) return undefined
  const seconds = Number.parseInt(header, 10)
  if (Number.isNaN(seconds) || seconds < 0) return undefined
  return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
