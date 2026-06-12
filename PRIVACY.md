# Privacy

## Summary

This software runs entirely on your local machine. It does not transmit any personal data to the author, the contributors, or any third party other than the broker API endpoints you explicitly configure.

## Data Flow

When you use this software:

1. Claude Desktop launches the server as a local subprocess on your machine.
2. The server reads your API credentials from environment variables provided by Claude Desktop's user-config mechanism, which uses your operating system's keychain (macOS Keychain / Windows Credential Manager).
3. The server makes HTTPS requests to the API endpoints for the sources you configured — for example `live.trading212.com` / `demo.trading212.com` for Trading 212, the Bybit API (`api.bybit.com`), and, for crypto wallets, public blockchain and price endpoints: a public Solana RPC node (`api.mainnet-beta.solana.com`), `mempool.space` (Bitcoin), `litecoinspace.org` (Litecoin), `api.blockcypher.com` (Dogecoin), `tonapi.io` (TON), Jupiter (`lite-api.jup.ag`, Solana limit orders and token symbols), and DefiLlama (`coins.llama.fi`, USD prices — receives token identifiers only, never your address). Crypto reads are **keyless**: only your public wallet address is sent — no key or secret is involved.
4. The server returns parsed responses to Claude Desktop on your local machine.
5. **No data leaves your machine to any destination other than the broker** (true of this release in its entirety — see "Pro License Check" below for the only planned future addition). The author and contributors have no servers, no analytics endpoints, no error-reporting services involved in this data flow.

## What We Do Not Collect

The author and contributors do not collect, receive, store, or process any of the following:

- Your identity or contact information
- Your API keys, secrets, or any other credentials
- Your portfolio holdings, transactions, dividends, prices, or any account data
- Telemetry, analytics, error reports, crash dumps, or usage statistics
- Your IP address, device information, operating system, or any other identifier

There is no telemetry endpoint. There is no analytics SDK. There is no error-reporting service. You can verify this independently by reading the source code: `grep -rn "fetch\|http" src/` will surface every outbound network call, all of which, in this build, target broker API hostnames.

## Pro License Check (not yet active)

A paid "Pro" tier (crypto features) is planned. Its entire enforcement
mechanism ships in the source code today but is **disabled by a compile-time
constant** (`PAYWALL_ENABLED` in `src/license/config.ts`) — you can verify
with `grep -rn "PAYWALL_ENABLED" src/` that it is `false` and that no license
network call can happen. As of this release, **no license request exists at
runtime.**

When the Pro tier launches (announced in the changelog), the following will
become true — and only then:

- **Pro subscribers only:** the extension exchanges the license key for a
  cached monthly verdict with the merchant of record — roughly one HTTPS
  request per month. The request contains the license key and nothing else.
- **Free users:** never contact the license server. Nothing changes for them.
- **Self-built `freepro` builds** (see `docs/building-pro.md`): never contact
  the license server either, regardless of tier.
- The cached verdict lives in a local state file containing timestamps and a
  short key fingerprint — never the key itself, never any portfolio data.

## GDPR Position

Under Regulation (EU) 2016/679 (GDPR):

- The author and contributors do **not** act as **data controller** for your data, because they neither determine the purposes and means of the processing nor have access to the data (Article 4(7) GDPR).
- The author and contributors do **not** act as **data processor** for your data, because no processing occurs on their behalf and no data is received (Article 4(8) GDPR).
- When you use this software for personal, non-professional purposes, your processing of your own broker data falls within the **personal or household activity exemption** of Article 2(2)(c) GDPR.
- If you use this software in a professional context (for example, as part of services you provide to third parties for compensation), you are the controller for any personal data involved, and the author and contributors still have no access to that data and play no role in its processing.

Because the author and contributors are neither controller nor processor for your data, the obligations of Articles 13/14 (information to be provided to the data subject), Article 30 (records of processing), and Article 37 (designation of a Data Protection Officer) do not apply to them in respect of your use of this software.

## API Key Handling

- Keys are passed to the server process via environment variables set by Claude Desktop from its keychain-backed user-config store.
- Keys are **never** logged to standard output, standard error, or any file by this server. Diagnostic dumps written when a provider changes its response format are redacted (credential-shaped fields removed) and size-capped before they reach the log.
- Keys are **never** included in error messages returned to the LLM.
- Keys are transmitted **only** to the broker API endpoints over HTTPS.
- When you uninstall the extension, Claude Desktop removes the keys from your keychain.

Note on local logs: Claude Desktop persists this server's standard error to a local `mcp-server-*.log` file on your machine. If a provider changes its response format, a redacted, size-capped excerpt of that response (portfolio data shapes, never credentials) may appear there to make the breakage diagnosable. That file never leaves your machine.

## Source Verification

This is open-source software under the MIT License. You are encouraged to inspect the source code before installing. Useful commands:

```sh
grep -rn 'fetch(' src/         # all outbound HTTP calls
grep -rn 'console\.' src/      # all logging
grep -rn 'process\.env' src/   # all environment access
```

## Contact

For privacy-related questions or concerns, please use the channel described in [SECURITY.md](SECURITY.md).
