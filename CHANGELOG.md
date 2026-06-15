# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.2] - 2026-06-15

### Fixed
- **Bybit coin amounts are no longer mistakable for dollar values.** In
  `bybit_get_balances_overview`, Bybit's `coinDetail[].equity` is a coin AMOUNT
  (holdings), not a USD figure — a delisted/zero-price token shows its full coin
  count while being worth ~$0. It was surfaced under the money-sounding name
  `equity`, which could lead a reader to report, say, 48,707 BBL as $48,707. The
  per-coin field is now labeled `quantity`; the only fiat figures are the
  account/total `equity` totals (in `valuationCurrency`). The `bybit_get_account`
  per-coin description was likewise clarified — `quantity`/`equity` are coin
  amounts and `usdValue` (absent for coins with no USD market) is the dollar value.

### Security
- **Pinned `vite` to 8.0.16** to clear a high-severity advisory. `vite` is a
  dev/test-only transitive dependency (via `vitest`) and never ships in the
  `.mcpb` bundle, so released servers were unaffected — the pin keeps the CI
  `npm audit` gate green.

## [0.6.1] - 2026-06-14

### Fixed
- **Bybit Earn token position no longer errors out.** Bybit serializes the
  `aprE8`/`bonusAprE8` APY fields as strings, but the schema required numbers, so
  reading a flexible-savings (token) position failed validation. The schema now
  accepts a string or a number (the APY is normalized identically), matching how
  the dual-asset `apyE8` field was already handled.

## [0.6.0] - 2026-06-14

### Added
- **Ethereum & EVM wallets (Pro).** Paste a public `0x…` address into the wallet
  field and Fenek reads it across Ethereum, Arbitrum, Optimism, Base, and Polygon
  — native balance plus ERC-20 holdings — keyless through public Blockscout
  instances, priced via DefiLlama. The chain is auto-detected (EIP-55 checksum
  validated), so EVM addresses sit alongside the existing Solana/TON/Bitcoin/
  Litecoin/Dogecoin wallets in the same field, with no API key. As a crypto
  source it falls under Fenek Pro. NFTs (ERC-721/1155) are excluded, and
  per-network reads are isolated so one slow explorer never sinks the others.

## [0.5.0] - 2026-06-13

### Added
- **Fenek Pro is live.** Crypto sources (Bybit, on-chain wallets) now require a
  Fenek Pro license key, validated about once a month against Polar (the
  merchant of record, `api.polar.sh`); the check sends only the license key.
  Classic brokers (Trading 212) and the cross-broker overview stay free, and
  the official free self-build path `npm run pack:freepro`
  (`docs/building-pro.md`) still unlocks everything without a license. Built on
  the tier-aware tool registry and license manager (monthly verdict cache,
  14-day grace, "revoked" distinguished from "unreachable") with the
  `LICENSE_KEY` field stored in the OS keychain.
- **Update notices.** Fenek now reminds you in chat when a newer version is out:
  a no-network age-based nudge when a build is over two months old, plus an
  opt-out weekly check against `api.github.com` that reads only the latest
  release number. Toggle it with the new "Check for updates weekly" setting
  (`CHECK_UPDATES`). The manifest's homepage and privacy links now point at
  fenek.tech.
- **Stricter error handling.** Tool errors now carry a directive next action —
  the exact missing read scope, a "wait, don't retry" on rate limits, "don't
  fabricate" on unexpected data — and the server instructs the assistant never
  to retry, work around, speculate, or invent figures on an error or empty result.

## [0.4.1] - 2026-06-12

Security hardening release: closes every finding from a full audit of the
codebase, CI pipeline, and MCP surface. No new tools, no new data.

### Security
- On-chain token symbols (TON jettons, Solana SPL tokens via Jupiter) are sanitized
  before they reach tool results: control, bidi-override, and zero-width characters
  are stripped, whitespace is collapsed, and length is capped at 32. Anyone can mint
  a token with an arbitrary name and airdrop it to a watched wallet, which made this
  the one provider field a third party could weaponize for prompt injection. The
  server instructions now also direct the model to treat instrument and token names
  as data, never as instructions.
- Schema-mismatch diagnostic dumps are redacted (credential-shaped fields removed)
  and size-capped before reaching stderr, which Claude Desktop persists to a local
  log file. Bybit's key-info endpoint echoes the API key in its response, so schema
  drift there would previously have written the key to that log.
- Authenticated broker requests refuse HTTP redirects (`redirect: "error"`): fetch
  does not strip Bybit's custom `X-BAPI-*` auth headers on cross-origin redirects,
  and no broker read endpoint redirects legitimately.
- The release workflow is split into a read-only test job and a minimal write job,
  so the dev toolchain never executes next to tokens that can rewrite releases or
  mint attestations. Dependency lifecycle scripts are disabled in CI
  (`--ignore-scripts`), actions are pinned to commit SHAs, checkout credentials are
  not persisted, and the `.mcpb` is packed with the lockfile-verified mcpb CLI
  instead of an unverified registry re-fetch.
- GitHub vulnerability intake is enabled: Dependabot alerts and private
  vulnerability reporting (the channel SECURITY.md documents).

### Fixed
- Every outbound request now carries a 15-second timeout, so a hung provider cannot
  wedge a tool call (crypto wallets are read sequentially, which multiplied any hang).
- A provider-supplied `Retry-After` header is honored up to 60 seconds instead of
  verbatim (a malicious `86400` would have put the call to sleep for a day).
- Jupiter limit-order pagination is capped at 20 pages instead of trusting the
  provider-reported page count unbounded.
- Free-form tool inputs (pagination cursor, search query, pie id, coin ids) are
  length-capped at the schema boundary.
- In-memory TTL caches are bounded (1000 entries, FIFO eviction); they previously
  grew without limit because entries expired only when re-read.

### Changed
- Every tool now declares `openWorldHint`: true for network-backed broker and
  analytics tools, false for local-only playbooks and onboarding.
- PRIVACY.md names every outbound host (adds `litecoinspace.org` and Jupiter) and
  documents the local-log behavior on schema drift; README gains a "Verify your
  download" section with the `gh attestation verify` command.
- Checksummed synthetic addresses replace live-chain vectors in tests.

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

[Unreleased]: https://github.com/Guck111/fenek-portfolio-companion/compare/v0.4.1...HEAD
[0.4.0]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.4.0
[0.3.0]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.3.0
[0.2.2]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.2.2
[0.2.1]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.2.1
[0.1.1]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.1.1
[0.1.0]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.1.0
