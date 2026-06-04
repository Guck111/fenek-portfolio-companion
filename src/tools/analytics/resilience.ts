// Cross-broker tools aggregate over every configured broker. One broker failing
// (e.g. an expired key → 401, or a 5xx) must not crash the whole aggregate — the
// user still wants the data from the brokers that did respond. These helpers
// capture per-broker failures so callers can keep going and surface them in the
// result's `errors` field instead of throwing.

export interface BrokerFailure {
  readonly brokerId: string
  readonly brokerName: string
  readonly error: string
}

export function toBrokerFailure(
  broker: { readonly id: string; readonly name: string },
  error: unknown,
): BrokerFailure {
  return {
    brokerId: broker.id,
    brokerName: broker.name,
    error: error instanceof Error ? error.message : String(error),
  }
}

// Runs `load` for one broker. On success returns its value; on failure records a
// BrokerFailure in `failures` and returns undefined so the caller can skip it.
export async function collectBroker<T>(
  broker: { readonly id: string; readonly name: string },
  load: () => Promise<T>,
  failures: BrokerFailure[],
): Promise<T | undefined> {
  try {
    return await load()
  } catch (error) {
    failures.push(toBrokerFailure(broker, error))
    return undefined
  }
}
