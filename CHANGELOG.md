# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.2]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.2.2
[0.2.1]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.2.1
[0.1.1]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.1.1
[0.1.0]: https://github.com/Guck111/fenek-portfolio-companion/releases/tag/v0.1.0
