# Fenek Portfolio Companion

Read-only MCP server that aggregates your portfolio data across wallets, exchanges and brokers available in Europe — currently Trading 212, Bybit, and Solana/TON wallets — and gives Claude access to it for analysis. It is a data aggregator: it collects your data and computes neutral metrics on it, and never makes recommendations. Architected to add more sources without changing the core or existing adapters.

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
- **Environment** — `demo` (paper trading) by default. Switch to `live` only after verifying behavior on a demo account.
- **Language** — `en` (default) or `ru` for slash-prompt instructions to Claude.

Credentials are stored by Claude Desktop in your operating system's keychain (macOS Keychain / Windows Credential Manager). They are never logged, never written to disk by this server, and never transmitted anywhere except the Trading 212 API endpoints you configured. See [PRIVACY.md](PRIVACY.md).

### Crypto wallets (Solana + TON) — optional

In addition to (or instead of) Trading 212, you can surface on-chain holdings by **public wallet address**. This is opt-in and additive — leave the fields blank to skip it entirely.

- **Solana wallet address** — your public address (e.g. from Phantom). A public address is not a secret; it cannot move funds.
- **TON wallet address** — your public address from Telegram Wallet → **TON Space** (the non-custodial part). The custodial `@wallet` balance is **not** readable by anyone and is out of scope.
- **Helius API key** — a free key from [helius.dev](https://helius.dev), required **only** to read Solana holdings. It is stored in your OS keychain. TON needs no key.

Notes and limitations:

- **USD valuation only.** Holdings are priced in USD via [DefiLlama](https://defillama.com). On-chain wallets carry no cost basis, so **no average price and no profit/loss** are reported for crypto. In `portfolio_overview` the crypto USD total appears as its own currency bucket alongside your Trading 212 currency — the two are never summed (no FX conversion).
- **Spam/unpriced tokens are omitted.** Only tokens with a non-zero balance and a resolvable price are shown.
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
Bybit, DefiLlama, Helius, TON, Jupiter). Your API keys are stored in your operating
system's keychain by Claude Desktop, are never logged, and are transmitted only to the
broker endpoints they belong to.

Full policy: **[PRIVACY.md](PRIVACY.md)**.

## License

MIT — see [LICENSE](LICENSE).
