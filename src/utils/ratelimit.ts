export interface BackoffOptions {
  readonly maxRetries: number
  readonly initialDelayMs: number
  readonly maxDelayMs: number
  readonly multiplier: number
}

const DEFAULTS: BackoffOptions = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 8000,
  multiplier: 2,
}

export type RetryDecision = boolean | { readonly delayMs: number }

export async function withBackoff<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: unknown, attempt: number) => RetryDecision,
  options: Partial<BackoffOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULTS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === opts.maxRetries) break

      const decision = shouldRetry(error, attempt)
      if (decision === false) break

      const delay =
        typeof decision === "object"
          ? decision.delayMs
          : Math.min(opts.initialDelayMs * Math.pow(opts.multiplier, attempt), opts.maxDelayMs)

      await sleep(delay)
    }
  }
  throw lastError
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
