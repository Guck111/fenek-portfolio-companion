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

interface BrokerGuidance {
  readonly name: string
  readonly scopes: string
}

// Per-broker read-scope guidance for auth failures. A new broker adds one line
// here; the broker adapters themselves stay untouched.
const BROKER_GUIDANCE: Readonly<Record<string, BrokerGuidance>> = {
  t212: {
    name: "Trading 212",
    scopes:
      "Account data, Portfolio, Pies, History, Metadata, and Orders (read) in Trading 212 → Settings → API",
  },
  bybit: {
    name: "Bybit",
    scopes:
      "the read groups (Unified Trading, Assets/Wallet, Earn) in your Bybit API key settings — run bybit_get_key_info to see what the current key can access",
  },
  ibkr: {
    name: "Interactive Brokers",
    scopes:
      "the sections of your Flex Query (Open Positions, Net Asset Value, Cash Report, Cash Transactions) and a non-expired Flex Web Service token — regenerate the token in Client Portal → Settings → Account Settings → Flex Web Service if it expired",
  },
}

function brokerName(brokerId: string): string {
  return BROKER_GUIDANCE[brokerId]?.name ?? brokerId
}

// Error texts are DIRECTIVE, not descriptive: each one states the single
// next action and, where it matters, what NOT to do (retry, loop, fabricate).
// They are user-facing — safe to show as-is. The "how to behave" backstop
// lives in SERVER_INSTRUCTIONS (src/server.ts).
export function toUserMessage(error: unknown): string {
  if (error instanceof AuthError) {
    const guidance = BROKER_GUIDANCE[error.brokerId]
    const fix = guidance
      ? `Enable ${guidance.scopes}.`
      : "Enable read-only permissions for this source in its API settings."
    return `${brokerName(error.brokerId)} rejected the request — the API key is missing a required read permission. ${fix} Re-running this will not help until the permission is added.`
  }
  if (error instanceof RateLimitError) {
    const wait = error.retryAfterMs
      ? ` Wait about ${String(Math.ceil(error.retryAfterMs / 1000))}s.`
      : ""
    return `${brokerName(error.brokerId)} is rate-limiting requests.${wait} Tell the user to try again shortly; do not retry the call now.`
  }
  if (error instanceof BrokerApiError) {
    const code = error.statusCode ? ` (HTTP ${String(error.statusCode)})` : ""
    return `${brokerName(error.brokerId)} returned a server-side error${code}: ${error.message}. This is a problem on the broker's side, not the user's keys or data — do not loop on it.`
  }
  if (error instanceof ValidationError) {
    return `A source returned data in an unexpected format, likely an API change. ${error.message} This is a Fenek issue to report, not the user's fault — do not fabricate or estimate any values.`
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Unknown error"
}
