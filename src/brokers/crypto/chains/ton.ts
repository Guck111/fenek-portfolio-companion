import { BrokerApiError } from "../../../utils/errors.js"
import { withBackoff, type RetryDecision } from "../../../utils/ratelimit.js"
import { TonAccount, TonJettonsResponse } from "../schemas.js"

import type { RawHolding } from "../types.js"

const BROKER_ID = "crypto"
const TON_COIN_ID = "coingecko:the-open-network"
const NANO = 1_000_000_000

export function mapTonHoldings(account: TonAccount, jettons: TonJettonsResponse): RawHolding[] {
  const out: RawHolding[] = []
  const ton = account.balance / NANO
  if (ton > 0) out.push({ chain: "ton", symbol: "TON", amount: ton, coinId: TON_COIN_ID })
  for (const b of jettons.balances) {
    const decimalsRaw = b.jetton.decimals
    const decimals =
      typeof decimalsRaw === "string" ? Number.parseInt(decimalsRaw, 10) : (decimalsRaw ?? 9)
    const amount = Number(b.balance) / Math.pow(10, decimals)
    if (!Number.isFinite(amount) || amount <= 0) continue
    out.push({
      chain: "ton",
      symbol: b.jetton.symbol ?? b.jetton.address.slice(0, 6),
      amount,
      coinId: `ton:${b.jetton.address}`,
    })
  }
  return out
}

function retryOn5xx(error: unknown): RetryDecision {
  return error instanceof BrokerApiError && (error.statusCode ?? 0) >= 500
}

async function getJson(url: string): Promise<unknown> {
  return withBackoff(async () => {
    const res = await fetch(url)
    if (!res.ok) {
      throw new BrokerApiError(`tonapi HTTP ${String(res.status)}`, BROKER_ID, res.status)
    }
    return res.json()
  }, retryOn5xx)
}

export async function fetchTonHoldings(address: string): Promise<RawHolding[]> {
  const account = TonAccount.parse(await getJson(`https://tonapi.io/v2/accounts/${address}`))
  const jettons = TonJettonsResponse.parse(
    await getJson(`https://tonapi.io/v2/accounts/${address}/jettons`),
  )
  return mapTonHoldings(account, jettons)
}
