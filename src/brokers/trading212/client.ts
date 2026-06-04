import type { z } from "zod"

import { AuthError, BrokerApiError, RateLimitError, ValidationError } from "../../utils/errors.js"

const BROKER_ID = "t212"

export type T212Environment = "demo" | "live"

export interface T212ClientConfig {
  readonly apiKey: string
  readonly apiSecret: string
  readonly environment: T212Environment
}

const BASE_URLS: Record<T212Environment, string> = {
  demo: "https://demo.trading212.com/api/v0",
  live: "https://live.trading212.com/api/v0",
}

const MAX_RETRIES = 2
const NETWORK_BACKOFF_BASE_MS = 500

export class Trading212Client {
  private readonly authHeader: string
  private readonly baseUrl: string

  constructor(config: T212ClientConfig) {
    if (!config.apiKey || !config.apiSecret) {
      throw new AuthError("T212 API key and secret are required", BROKER_ID)
    }
    const credentials = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64")
    this.authHeader = `Basic ${credentials}`
    this.baseUrl = BASE_URLS[config.environment]
  }

  async getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const res = await this.fetchWithRetry(path)

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
      // Log raw response so the actual T212 shape ends up in Claude Desktop's
      // mcp-server-*.log when our schema drifts. Helps update schemas without
      // re-running discovery scripts. Sanitize: T212 doesn't return secrets in
      // these endpoints, only public-ish portfolio data.
      console.error(`[t212] schema mismatch for ${path}; raw response was:`, JSON.stringify(data))
      throw new ValidationError(
        `Trading 212 response shape mismatch for ${path}: ${parsed.error.message}`,
        { cause: parsed.error },
      )
    }
    return parsed.data
  }

  private async fetchWithRetry(path: string): Promise<Response> {
    const url = `${this.baseUrl}${path}`
    let lastNetworkError: unknown

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(url, { headers: { Authorization: this.authHeader } })
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
  return seconds * 1000
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
