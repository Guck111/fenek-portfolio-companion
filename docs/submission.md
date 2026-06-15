# Anthropic MCP Directory — Submission Materials

Review packet for **Fenek Portfolio Companion**. This document is for directory
reviewers; it is not bundled into the `.mcpb` (see `.mcpbignore`).

---

## Listing

| Field | Value |
|---|---|
| **Name** | Fenek Portfolio Companion |
| **Tagline** | Read-only AI analysis of your brokerage and crypto portfolio. |
| **Version** | 0.4.0 |
| **License** | MIT |
| **Repository** | https://github.com/Guck111/fenek-portfolio-companion |
| **Homepage / Docs** | https://github.com/Guck111/fenek-portfolio-companion/blob/master/README.md |
| **Support** | https://github.com/Guck111/fenek-portfolio-companion/issues |
| **Security policy** | https://github.com/Guck111/fenek-portfolio-companion/blob/master/SECURITY.md |
| **Privacy policy** | https://github.com/Guck111/fenek-portfolio-companion/blob/master/PRIVACY.md |
| **Transport** | Local stdio subprocess, packaged as an MCPB desktop extension (`.mcpb`) |
| **Runtime** | Node.js ≥ 20 (bundled by Claude Desktop) |
| **Platforms** | macOS (darwin), Windows (win32) |
| **Capabilities** | **READ-ONLY.** Tools, prompts. No write operations of any kind. |

### Description

An unofficial, open-source MCP server that aggregates a user's portfolio data across
wallets, exchanges, and brokers available in Europe — **Trading 212**, **Bybit**, and
**Ethereum & EVM / Solana / TON / Bitcoin** wallets — and exposes it **read-only** to Claude for analysis. The user
can ask about positions, pies, dividends, balances, concentration, and overlap in plain
language. It is strictly a data aggregator plus neutral metrics on the user's own data;
it never recommends trades. No telemetry. API keys are held in the OS keychain.

### Use cases

- "What's my total portfolio value and how is it split by currency?"
- "Which tickers am I most concentrated in across all my accounts and pies?"
- "Do any of my Trading 212 pies overlap on the same ETF?"
- "Summarize the dividends I received last year by month."
- "What crypto am I holding on-chain right now, valued in USD?"
- "Do I have any open orders on Bybit or open Jupiter limit orders?"
- "What derivatives am I exposed to on Bybit, and how close am I to liquidation?"
- "How much is sitting in Bybit Earn and my Funding wallet, and at what APY?"

---

## Authentication model

Credentials are collected by Claude Desktop through the MCPB `user_config` mechanism and
stored in the **OS keychain** (macOS Keychain / Windows Credential Manager). They are
passed to the server process as environment variables at launch, are **never logged**, and
are transmitted **only** to the provider endpoint they belong to. Every credential field
is per-provider and read-only by design:

| `user_config` key | Sensitive | Required | Purpose |
|---|---|---|---|
| `T212_API_KEY` | yes (keychain) | no | Trading 212 read-only API key |
| `T212_API_SECRET` | yes (keychain) | no | Trading 212 API secret |
| `WALLET_ADDRESSES` | no (public addresses) | no | Public wallet addresses (Ethereum & EVM L2s, Solana, TON, Bitcoin, Litecoin, Dogecoin), any separator; chain auto-detected, read keyless |
| `BYBIT_API_KEY` | yes (keychain) | no | Bybit read-only API key |
| `BYBIT_API_SECRET` | yes (keychain) | no | Bybit API secret |

A broker's tools are only registered if its credentials are supplied. With no credentials
at all, the server still starts and exposes the four cross-broker analytics tools and four
playbook tools (they simply report empty aggregates).

---

## Tools

**Every tool is read-only.** `annotations.readOnlyHint: true` is stamped centrally in the
tool registry, so no tool can be exposed without it; each tool also carries a
human-readable `annotations.title`. 23 tools total.

### Trading 212 (registered when `T212_API_KEY` is set)

| Tool name | Title | Read-only |
|---|---|---|
| `t212_get_account` | Trading 212: Account Summary | ✅ |
| `t212_get_positions` | Trading 212: Open Positions | ✅ |
| `t212_get_pies` | Trading 212: Pies (Portfolios) | ✅ |
| `t212_get_pie` | Trading 212: Pie Details | ✅ |
| `t212_get_dividends` | Trading 212: Dividends | ✅ |
| `t212_get_transactions` | Trading 212: Cash Transactions | ✅ |
| `t212_get_order_history` | Trading 212: Order History | ✅ |
| `t212_get_open_orders` | Trading 212: Open Orders | ✅ |
| `t212_get_exchanges` | Trading 212: Exchange Working Hours | ✅ |
| `t212_search_instrument` | Trading 212: Search Instruments | ✅ |

### Crypto wallets — Ethereum & EVM L2s, Solana, TON, Bitcoin, Litecoin, Dogecoin (registered when `WALLET_ADDRESSES` is set)

| Tool name | Title | Read-only |
|---|---|---|
| `crypto_get_positions` | Crypto Wallets: Holdings | ✅ |
| `crypto_get_prices` | Crypto Wallets: Token Prices (Watchlist) | ✅ |
| `crypto_get_limit_orders` | Crypto Wallets: Jupiter Limit Orders (Solana) | ✅ |

### Bybit (registered when `BYBIT_API_KEY` is set)

| Tool name | Title | Read-only |
|---|---|---|
| `bybit_get_positions` | Bybit: Coin Balances | ✅ |
| `bybit_get_account` | Bybit: Account Summary & Margin Health | ✅ |
| `bybit_get_derivative_positions` | Bybit: Derivative Positions | ✅ |
| `bybit_get_earn_positions` | Bybit: Earn / Staked Positions | ✅ |
| `bybit_get_balances_overview` | Bybit: All-Account Balances Overview | ✅ |
| `bybit_get_open_orders` | Bybit: Open Orders | ✅ |
| `bybit_get_key_info` | Bybit: API Key Diagnostics | ✅ |

### Cross-broker analytics (always registered)

| Tool name | Title | Read-only |
|---|---|---|
| `portfolio_overview` | Portfolio: Overview (All Brokers) | ✅ |
| `portfolio_concentration` | Portfolio: Concentration by Ticker (All Brokers) | ✅ |
| `portfolio_pie_overlap` | Portfolio: Pie Overlap (Shared Tickers) | ✅ |
| `portfolio_dividend_history` | Portfolio: Dividend History (All Brokers) | ✅ |

### Playbooks — tool form of the slash-prompts (always registered)

| Tool name | Title | Read-only |
|---|---|---|
| `analyze_overview` | Playbook: Portfolio Overview | ✅ |
| `analyze_concentration` | Playbook: Concentration Review | ✅ |
| `review_pie` | Playbook: Review a Pie | ✅ |
| `review_dividends` | Playbook: Review Dividends | ✅ |

### Onboarding (always registered)

| Tool name | Title | Read-only |
|---|---|---|
| `fenek_getting_started` | Fenek: Getting Started | ✅ |

Credential-free; also exposed as a prompt of the same name.

### Prompts (slash-commands)

`fenek_getting_started` (a credential-free onboarding overview), plus `analyze_overview`,
`analyze_concentration`, `review_pie`, `review_dividends`. English; the model replies in
the user's language conversationally.

### Notes for the reviewer

- **Pagination.** `t212_get_dividends`, `t212_get_transactions`, `t212_get_order_history`
  accept `limit` (1–50, default 20) and a `cursor`; responses carry `nextCursor`.
- **Errors.** Provider 4xx/5xx map to typed, human-readable errors. On 401/403 the server
  names the missing API-key scope so the user can fix it. 429 triggers bounded exponential
  backoff (max 3 attempts) before a structured error.
- **Partial-failure resilience.** The cross-broker `portfolio_*` tools do not fail wholesale
  when one source errors (e.g. an expired key): they return the healthy brokers' data and
  list the failures in an `errors` field.
- **No safe/unsafe mixing.** There are no write tools, so no tool blends read and write
  behavior. The read-only posture is enforced structurally in the registry.
- **Server `instructions`.** At `initialize`, the server briefs the client that it is
  read-only, must not recommend trades/rebalancing, and must name the missing scope on
  401/403. See `SERVER_INSTRUCTIONS` in `src/server.ts`.

---

## Security & privacy self-check (directory hard-gates)

| Requirement | Status |
|---|---|
| `annotations.title` + `annotations.readOnlyHint: true` on every tool | ✅ enforced centrally + covered by `tests/unit/tool-annotations.test.ts` |
| `privacy_policies` in `manifest.json` | ✅ → `PRIVACY.md` (HTTPS) |
| Privacy Policy section in README | ✅ |
| Non-empty test account with real-looking data | ✅ see reviewer setup below |
| Pagination on list endpoints | ✅ |
| Clear, typed error messages | ✅ |
| No mixing of safe/unsafe operations in one tool | ✅ read-only only |
| Credentials in OS keychain, never logged | ✅ MCPB `user_config` `"sensitive": true` |
| Zero telemetry / no phone-home | ✅ verifiable: `grep -rn 'fetch(' src/` hits only provider hosts |
| Pinned dependencies, `npm audit` in CI | ✅ exact pins, audit gate |
| Release provenance | ✅ `actions/attest-build-provenance` on the `.mcpb` |

---

## Reviewer test access

The maintainer provisions these accounts manually and shares the credentials privately
with the reviewer (they are **not** committed to the repo). A reviewer can install the
`.mcpb` from the latest [GitHub Release](https://github.com/Guck111/fenek-portfolio-companion/releases)
and enter the values below in Claude Desktop's extension settings.

**Minimum to exercise the server: one Trading 212 demo key + one public crypto address.**

### 1. Trading 212 (demo / paper trading)

A dedicated **practice** account funded with paper money, pre-seeded with a couple of
virtual positions and one pie, so the tools return data rather than empty arrays. This is
**not** the maintainer's real account.

- `T212_API_KEY` / `T212_API_SECRET`: a **read-only** key generated in the demo account
  (*Settings → API (Beta)*) with scopes **Account, Portfolio, Pies — Read, History,
  Metadata, Orders — Read** only. No Orders — Place, no Deposits/Withdrawals.

The server auto-detects demo vs live from the key — there is no environment field to set.

Try: `fenek_getting_started` for the overview, then `portfolio_overview`,
`t212_get_positions`, `t212_get_pies`, then `t212_get_pie` with an id from the pies list,
and the `analyze_overview` playbook.

### 2. Crypto wallets (public addresses — no account or API key needed)

One or more **public** addresses holding a few tokens — non-personal, not the maintainer's
own wallet. Public addresses cannot move funds. Every chain is read keyless (no API key).

- `WALLET_ADDRESSES`: public wallet addresses separated by commas, spaces, or new lines. The
  chain of each (Ethereum & EVM L2s, Solana, TON, Bitcoin, Litecoin, Dogecoin) is auto-detected
  from its format — e.g. an Ethereum `0x…` address (read across Arbitrum, Optimism, Base and
  Polygon too), a Solana address, and a Bitcoin `bc1…` address in the same field.

Try: `crypto_get_positions`, then `portfolio_overview` (the crypto USD total appears as its
own currency bucket — currencies are never summed).

### 3. Bybit (optional)

Bybit tools register only if `BYBIT_API_KEY` / `BYBIT_API_SECRET` are provided. If the
reviewer wants to exercise them, use a **read-only** key (no Trade, no Withdraw, no
Transfer) with read access to Unified Trading; the Assets/Wallet and Earn read groups
additionally enable `bybit_get_balances_overview` and `bybit_get_earn_positions` — without
them those two tools return an error naming the missing permission (by design), and
`bybit_get_key_info` reports what the key can do. Otherwise the Bybit tools simply do not
appear.

---

## Submitting

- Form: https://clau.de/desktop-extention-submission
- Or email: mcp-review@anthropic.com
- Reference: https://claude.com/docs/connectors/building/submission and the Local MCP
  Server Submission Guide at support.claude.com.
