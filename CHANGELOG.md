# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-06-11

Full exchange data coverage: every read-only money bucket Bybit and Trading 212
expose is now reachable, and previously stripped response fields are kept.

### Added
- **Bybit derivatives** — `bybit_get_derivative_positions`: open USDT/USDC perpetual,
  futures, inverse, and options positions with side, size, entry/mark price, unrealized
  and realized P&L, leverage, liquidation price, and TP/SL. Previously invisible.
- **Bybit Earn** — `bybit_get_earn_positions`: staked and saving balances across flexible
  savings, on-chain staking, fixed-term deposits, the BYUSDT yield token, and dual-asset
  products, with APY (normalized to percent) and claimable yield. Earn funds never appear
  in wallet balances, so they were invisible. Requires the Earn read permission.
- **Bybit all-account overview** — `bybit_get_balances_overview`: total equity in USD
  across every account type (Funding wallet, Unified Trading, Earn, Trading Bots, Copy
  Trading, Launchpool) with per-account coin holdings, plus Funding-wallet quantities.
  Requires the Assets/Wallet read permission.
- **Bybit account & margin health** — `bybit_get_account`: total equity, wallet/margin/
  available balances, perp UPL, margin rates (IM/MM — liquidation-risk indicators), and
  per-coin equity, unrealized/realized P&L, borrow amount, accrued interest, locked.
- **Bybit key diagnostics** — `bybit_get_key_info`: read-only flag, permission groups,
  IP allowlist, expiry (warns within 14 days), margin mode, and UTA status.
- **Trading 212 exchange hours** — `t212_get_exchanges`: venue working schedules including
  pre-market, after-hours, and overnight sessions; joins instruments via workingScheduleId.
- **Trading 212 richer history** — executed orders now include limit/stop price, quantities,
  time-in-force, and **realized P&L per fill**; dividends include the instrument name,
  quantity, gross amount per share, and the event kind (ordinary/bonus/interest/...).
- **Trading 212 honest pies** — pie lists now actually return dividend totals
  (gained/reinvested/in-cash), goal progress, and status; pie details report the
  dividend cash action (reinvest vs to cash).

### Changed
- Trading 212 account data is read from `/equity/account/summary` alone (one HTTP call
  instead of two) and now includes **all-time realized P&L**; the legacy
  `/equity/account/cash` endpoint remains as a fallback for older API revisions.
- Bybit `getAccount` reports the exchange's `totalEquity` (includes derivatives UPL and
  option value) instead of summing spot coins, and carries perp unrealized P&L.
- The Bybit key-setup guidance now lists the exact read permission groups (Unified
  Trading, Assets/Wallet, Earn); tools missing a group fail with an error naming it.

## [0.3.0] - 2026-06-06

### Added
- Crypto wallets now cover **Bitcoin, Litecoin, and Dogecoin** alongside Solana and TON —
  all read **keyless**, with no API keys, via public endpoints.
- A single **Wallet addresses** field replaces the separate per-chain fields: paste any mix
  of addresses (commas, spaces, or new lines) and each address's chain is detected
  automatically from its format and checksum.
- `crypto_get_positions` reports addresses it skipped — unrecognized, on a not-yet-supported
  chain, or failed to load — instead of dropping them silently.

### Changed
- **Solana is now keyless.** Holdings are read from a public Solana RPC node (native SOL plus
  SPL Token and Token-2022 accounts); the Helius API key is no longer used.

### Removed
- The `SOLANA_ADDRESS`, `TON_ADDRESS`, and `HELIUS_API_KEY` configuration fields, replaced by
  the single keyless **Wallet addresses** field.

## [0.2.2] - 2026-06-05

### Changed
- Point the manifest `author` field at the maintainer's GitHub profile (a directory
  submission requirement).

## [0.2.1] - 2026-06-05

Connector configuration simplified.

### Changed
- Trading 212 demo vs live is now detected automatically from the API key; the
  `ENVIRONMENT` setting is gone. Every credential field is optional, so you configure
  only the sources you use.
- Config fields are grouped by provider with clearer titles and shorter descriptions; the
  getting-started pointer now lives in the extension overview instead of being crammed into
  the first field.

### Added
- `fenek_getting_started` — a credential-free overview of what the extension does and how
  to set it up, runnable before any keys are entered. Exposed as both a prompt and a tool,
  so clients that surface only tools (not prompts) can reach it too.

### Fixed
- Cross-broker tools (`portfolio_overview`, `portfolio_concentration`,
  `portfolio_pie_overlap`, `portfolio_dividend_history`) no longer fail entirely when a
  single broker errors (e.g. an expired key → 401). They return the healthy brokers' data
  and report per-broker failures in an `errors` field.

### Removed
- The `LANGUAGE` setting and the Russian prompt translations. Prompts are English; the
  model replies in the user's language conversationally.

## [0.1.1] - 2026-06-04

Directory-compliance and metadata release ahead of the Anthropic MCP Directory submission.

### Added
- Human-readable `title` and a `readOnlyHint: true` annotation on every MCP tool. The
  read-only hint is stamped centrally in the tool registry, so no tool can be exposed
  without it and a binding cannot override it.
- `privacy_policies` link in `manifest.json` and a Privacy Policy section in the README.
- `docs/submission.md` with the directory review packet.

## [0.1.0] - 2026-06-04

First public release, submitted to the Anthropic MCP Directory.

### Added
- Read-only data aggregation across EU-available sources: Trading 212 (positions,
  pies, dividends, transactions, order history), Bybit (coin balances, open orders),
  Solana/TON wallets, and Jupiter limit orders.
- Cross-source analytics: overview, concentration, pie overlap, dividend history.
- Slash-prompt playbooks (overview, concentration, pie, dividends), EN + RU.
- CI (typecheck/lint/test/audit), DCO enforcement, and a tag-triggered release
  workflow that packs the `.mcpb` and attaches build provenance.

### Security
- Strictly read-only. API keys stored in the OS keychain. No telemetry; the only
  outbound host is the broker API the user configures.

[0.4.0]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.4.0
[0.3.0]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.3.0
[0.2.2]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.2.2
[0.2.1]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.2.1
[0.1.1]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.1.1
[0.1.0]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.1.0
