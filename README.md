# Fenek Portfolio Companion

Read-only MCP server that aggregates your portfolio data across wallets, exchanges and brokers available in Europe — currently Trading 212, Bybit, and Solana, TON, Bitcoin, Litecoin and Dogecoin wallets — and gives Claude access to it for analysis. It is a data aggregator: it collects your data and computes neutral metrics on it, and never makes recommendations. Architected to add more sources without changing the core or existing adapters.

> **NOT FINANCIAL ADVICE.** This is an informational tool. You are solely responsible for any decisions you make based on its output. The author is not a registered investment advisor in any jurisdiction. Read [DISCLAIMER.md](DISCLAIMER.md) before using.
>
> **READ-ONLY.** No tool in this server can place orders, transfer funds, or modify your account. API keys must be created with read-only permissions.
>
> **UNOFFICIAL.** Not affiliated with, endorsed by, or sponsored by Trading 212, Bybit, or any other broker, exchange, or wallet provider.
>
> **NON-COMMERCIAL OSS.** Free open-source software provided under the MIT License. No paid features, no telemetry, no affiliate relationships.

## Install

Install via Claude Desktop: *Settings → Extensions → Browse → Fenek Portfolio Companion* (once published in the Anthropic MCP Directory).

For local development install, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Configuration

When installing, Claude Desktop will prompt for:

- **Trading 212 API Key + Secret** — generated in Trading 212: *Settings → API (Beta)*. Enable **READ-ONLY** scopes only: *Account data, Portfolio, Pies — Read, History, Metadata, Orders — Read*. **Do not** enable Orders — Place, Deposits, or Withdrawals. This server does not need them and will never call them.

Whether your key belongs to a **demo** (paper) or **live** account is detected automatically from the key — there is no environment switch to set, and the server is read-only against either. New here? Run the **`/fenek_getting_started`** prompt in chat for a guided overview — it needs no keys.

Credentials are stored by Claude Desktop in your operating system's keychain (macOS Keychain / Windows Credential Manager). They are never logged, never written to disk by this server, and never transmitted anywhere except the Trading 212 API endpoints you configured. See [PRIVACY.md](PRIVACY.md).

### Crypto wallets — optional

In addition to (or instead of) Trading 212, you can surface on-chain holdings by **public wallet address**. Opt-in and additive — leave the field blank to skip it entirely.

- **Wallet addresses** — paste one or more public addresses into a single field, separated by commas, spaces, or new lines. The chain of each is detected automatically from its format. Supported today: **Solana, TON, Bitcoin, Litecoin, Dogecoin**. A public address is not a secret; it cannot move funds.
- **No API keys, ever.** Every chain is read keyless via public endpoints (the Solana public RPC, [mempool.space](https://mempool.space), [blockcypher](https://www.blockcypher.com), tonapi) — nothing to sign up for. TON's non-custodial **TON Space** address is readable; the custodial Telegram `@wallet` balance is not, and is out of scope.

Notes and limitations:

- **USD valuation only.** Holdings are priced in USD via [DefiLlama](https://defillama.com). On-chain wallets carry no cost basis, so **no average price and no profit/loss** are reported for crypto. In `portfolio_overview` the crypto USD total appears as its own currency bucket alongside your Trading 212 currency — the two are never summed (no FX conversion).
- **Spam/unpriced tokens are omitted.** Only tokens with a non-zero balance and a resolvable price are shown.
- **One address, not a whole wallet.** For account chains (Solana, TON) an address is the entire account. For UTXO chains (Bitcoin, Litecoin, Dogecoin) a single address is only part of an HD wallet — paste each address you want counted; xpub expansion is out of scope.
- **Skipped addresses are reported.** If an address isn't recognized, or its chain isn't readable yet, `crypto_get_positions` lists it so you know it was skipped rather than silently dropped.
- **Jupiter limit orders (limited).** `crypto_get_limit_orders` reads open orders from Jupiter's public Trigger v1 API (no extra key — `lite-api.jup.ag`). **Heads-up:** Jupiter's current **Limit Order V2 keeps order details private** (hidden until execution), so those orders are not exposed by any public API and won't appear here — an empty result does **not** mean you have none; check jup.ag. Funds locked by open V2 orders are still visible indirectly as reduced wallet balances.
- Read-only and not financial advice, exactly like the rest of this server.

### Bybit (coin balances) — optional

You can also surface your **Bybit** coin balances. This reads the **UNIFIED** account, valued in USD by the exchange. Opt-in and additive — leave the fields blank to skip it. Derivatives (perpetual/futures) positions are **not** included. Mainnet only.

- **Bybit API key + secret** — create in Bybit: *API → API Management → Create New Key*. Choose a **System-generated** key with **Read-Only** permission, enabling read access to **Account / Wallet** (sometimes labelled *Assets*). **Do not** enable Trade, Withdraw, or Transfer. This server does not need them and will never call them. The secret is shown only once; both are stored in your OS keychain.

Notes and limitations:

- **USD valuation only.** Coins are valued in USD by Bybit. The exchange does not return cost basis, so **no average price and no profit/loss** are reported. In `portfolio_overview` the Bybit USD total appears as its own currency bucket alongside your other accounts — currencies are never summed (no FX conversion).
- **Unpriced coins are omitted.** Only coins with a non-zero balance and a USD value are shown.
- Read-only and not financial advice, exactly like the rest of this server.

The `bybit_get_open_orders` tool lists your open (unfilled) orders (spot + USDT/USDC linear); the same Unified Trading Account read scope covers it.

## What it can do

- Show positions, pies, transactions, dividends
- Read on-chain crypto holdings (Solana + TON) by public address, valued in USD, plus look up USD prices for any watchlist coin
- See open Jupiter (Solana) limit orders — legacy Trigger v1 only; current Limit Order V2 is private (see Crypto notes)
- Read Bybit coin balances (UNIFIED account) valued in USD by the exchange
- See open (unfilled) orders on Bybit (spot + USDT/USDC perpetuals)
- Compute concentration, sector overlap, currency exposure across pies
- Surface discrepancies and patterns in your holdings

## What it cannot do (by design)

- Place, modify, or cancel orders
- Transfer funds, deposit, or withdraw
- Produce personalized buy / sell / rebalance recommendations — the LLM is instructed not to (see `SERVER_INSTRUCTIONS` in [src/server.ts](src/server.ts))

## Documentation

| File | Purpose |
|---|---|
| [DISCLAIMER.md](DISCLAIMER.md) | Legal and financial disclaimers, jurisdictional notes |
| [PRIVACY.md](PRIVACY.md) | What data is and is not collected |
| [SECURITY.md](SECURITY.md) | Vulnerability disclosure process |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute (DCO required) |
| [docs/adding-a-broker.md](docs/adding-a-broker.md) | Adding a new broker adapter |

## Privacy Policy

This server runs entirely on your machine and sends **zero telemetry**. No analytics,
no error reporting, no usage statistics, no "phone home." The only outbound network
traffic is to the broker/exchange/price API endpoints you configure (e.g. Trading 212,
Bybit, DefiLlama, the Solana public RPC, mempool.space, blockcypher, tonapi, Jupiter). Your API keys are stored in your operating
system's keychain by Claude Desktop, are never logged, and are transmitted only to the
broker endpoints they belong to.

Full policy: **[PRIVACY.md](PRIVACY.md)**.

## License

MIT — see [LICENSE](LICENSE).
