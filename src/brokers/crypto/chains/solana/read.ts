import { fetchJson } from "../../http.js"
import {
  SolanaBalanceResponse,
  SolanaTokenAccountsResponse,
  type SolanaTokenAccount,
} from "../../schemas.js"
import { resolveSymbols, shortMint } from "../../tokens.js"
import type { RawHolding } from "../../types.js"

const SOL_COIN_ID = "coingecko:solana"
const LAMPORTS_PER_SOL = 1_000_000_000

// Public, keyless Solana JSON-RPC. No API key — the wallet address is public and
// nothing secret is sent. Per-IP rate limits, so each user's own client has its
// own quota (see design §2). Endpoint rotation/fallback is a later phase.
const RPC_URL = "https://api.mainnet-beta.solana.com"
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"

/** Map a native lamports balance + parsed token accounts to priced-later holdings. */
export function mapSolanaHoldings(
  lamports: number,
  accounts: readonly SolanaTokenAccount[],
  symbols: ReadonlyMap<string, string>,
): RawHolding[] {
  const out: RawHolding[] = []
  const sol = lamports / LAMPORTS_PER_SOL
  if (sol > 0) out.push({ chain: "solana", symbol: "SOL", amount: sol, coinId: SOL_COIN_ID })
  for (const acc of accounts) {
    const info = acc.account.data.parsed.info
    const amount = Number(info.tokenAmount.amount) / Math.pow(10, info.tokenAmount.decimals)
    if (!Number.isFinite(amount) || amount <= 0) continue
    out.push({
      chain: "solana",
      symbol: symbols.get(info.mint) ?? shortMint(info.mint),
      amount,
      coinId: `solana:${info.mint}`,
    })
  }
  return out
}

function rpc(method: string, params: unknown): Promise<unknown> {
  return fetchJson(RPC_URL, "Solana RPC", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  })
}

async function fetchTokenAccounts(
  address: string,
  programId: string,
): Promise<SolanaTokenAccount[]> {
  const raw = await rpc("getTokenAccountsByOwner", [
    address,
    { programId },
    { encoding: "jsonParsed" },
  ])
  return SolanaTokenAccountsResponse.parse(raw).result.value
}

export async function fetchSolanaHoldings(address: string): Promise<RawHolding[]> {
  // The three RPC calls are independent — run them concurrently (one round-trip, not three).
  const [balanceRaw, tokenAccounts, token2022Accounts] = await Promise.all([
    rpc("getBalance", [address]),
    fetchTokenAccounts(address, TOKEN_PROGRAM),
    fetchTokenAccounts(address, TOKEN_2022_PROGRAM),
  ])
  const lamports = SolanaBalanceResponse.parse(balanceRaw).result.value
  const accounts = [...tokenAccounts, ...token2022Accounts]
  const mints = [...new Set(accounts.map((a) => a.account.data.parsed.info.mint))]
  const symbols = await resolveSymbols(mints)
  return mapSolanaHoldings(lamports, accounts, symbols)
}
