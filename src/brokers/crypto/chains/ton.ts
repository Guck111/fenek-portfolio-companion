import { fetchJson } from "../http.js"
import { TonAccount, TonJettonsResponse } from "../schemas.js"
import type { RawHolding } from "../types.js"

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

export async function fetchTonHoldings(address: string): Promise<RawHolding[]> {
  const enc = encodeURIComponent(address)
  // The two tonapi calls are independent — run them concurrently.
  const [accountRaw, jettonsRaw] = await Promise.all([
    fetchJson(`https://tonapi.io/v2/accounts/${enc}`, "tonapi"),
    fetchJson(`https://tonapi.io/v2/accounts/${enc}/jettons`, "tonapi"),
  ])
  return mapTonHoldings(TonAccount.parse(accountRaw), TonJettonsResponse.parse(jettonsRaw))
}
