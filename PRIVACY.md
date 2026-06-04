# Privacy

## Summary

This software runs entirely on your local machine. It does not transmit any personal data to the author, the contributors, or any third party other than the broker API endpoints you explicitly configure.

## Data Flow

When you use this software:

1. Claude Desktop launches the server as a local subprocess on your machine.
2. The server reads your API credentials from environment variables provided by Claude Desktop's user-config mechanism, which uses your operating system's keychain (macOS Keychain / Windows Credential Manager).
3. The server makes HTTPS requests to the broker API endpoints you configured (e.g., `live.trading212.com` or `demo.trading212.com`).
4. The server returns parsed responses to Claude Desktop on your local machine.
5. **No data leaves your machine to any destination other than the broker.** The author and contributors have no servers, no analytics endpoints, no error-reporting services involved in this data flow.

## What We Do Not Collect

The author and contributors do not collect, receive, store, or process any of the following:

- Your identity or contact information
- Your API keys, secrets, or any other credentials
- Your portfolio holdings, transactions, dividends, prices, or any account data
- Telemetry, analytics, error reports, crash dumps, or usage statistics
- Your IP address, device information, operating system, or any other identifier

There is no telemetry endpoint. There is no analytics SDK. There is no error-reporting service. You can verify this independently by reading the source code: `grep -rn "fetch\|http" src/` will surface every outbound network call, all of which target broker API hostnames.

## GDPR Position

Under Regulation (EU) 2016/679 (GDPR):

- The author and contributors do **not** act as **data controller** for your data, because they neither determine the purposes and means of the processing nor have access to the data (Article 4(7) GDPR).
- The author and contributors do **not** act as **data processor** for your data, because no processing occurs on their behalf and no data is received (Article 4(8) GDPR).
- When you use this software for personal, non-professional purposes, your processing of your own broker data falls within the **personal or household activity exemption** of Article 2(2)(c) GDPR.
- If you use this software in a professional context (for example, as part of services you provide to third parties for compensation), you are the controller for any personal data involved, and the author and contributors still have no access to that data and play no role in its processing.

Because the author and contributors are neither controller nor processor for your data, the obligations of Articles 13/14 (information to be provided to the data subject), Article 30 (records of processing), and Article 37 (designation of a Data Protection Officer) do not apply to them in respect of your use of this software.

## API Key Handling

- Keys are passed to the server process via environment variables set by Claude Desktop from its keychain-backed user-config store.
- Keys are **never** logged to standard output, standard error, or any file by this server.
- Keys are **never** included in error messages returned to the LLM.
- Keys are transmitted **only** to the broker API endpoints over HTTPS.
- When you uninstall the extension, Claude Desktop removes the keys from your keychain.

## Source Verification

This is open-source software under the MIT License. You are encouraged to inspect the source code before installing. Useful commands:

```sh
grep -rn 'fetch(' src/         # all outbound HTTP calls
grep -rn 'console\.' src/      # all logging
grep -rn 'process\.env' src/   # all environment access
```

## Contact

For privacy-related questions or concerns, please use the channel described in [SECURITY.md](SECURITY.md).
