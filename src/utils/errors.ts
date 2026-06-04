export class AuthError extends Error {
  readonly brokerId: string

  constructor(message: string, brokerId: string) {
    super(message)
    this.name = "AuthError"
    this.brokerId = brokerId
  }
}

export class RateLimitError extends Error {
  readonly brokerId: string
  readonly retryAfterMs?: number

  constructor(message: string, brokerId: string, retryAfterMs?: number) {
    super(message)
    this.name = "RateLimitError"
    this.brokerId = brokerId
    if (retryAfterMs !== undefined) this.retryAfterMs = retryAfterMs
  }
}

export class BrokerApiError extends Error {
  readonly brokerId: string
  readonly statusCode?: number

  constructor(message: string, brokerId: string, statusCode?: number) {
    super(message)
    this.name = "BrokerApiError"
    this.brokerId = brokerId
    if (statusCode !== undefined) this.statusCode = statusCode
  }
}

export class ValidationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "ValidationError"
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AuthError) {
    return `Authentication failed for ${error.brokerId}. Check API key and secret.`
  }
  if (error instanceof RateLimitError) {
    const retry = error.retryAfterMs ? ` Retry after ${String(error.retryAfterMs)} ms.` : ""
    return `Rate limit hit for ${error.brokerId}.${retry}`
  }
  if (error instanceof BrokerApiError) {
    const code = error.statusCode ? ` (HTTP ${String(error.statusCode)})` : ""
    return `${error.brokerId} API error${code}: ${error.message}`
  }
  if (error instanceof ValidationError) {
    return `Unexpected response shape from broker. ${error.message}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Unknown error"
}
