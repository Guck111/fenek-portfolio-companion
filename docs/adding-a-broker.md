# Adding a new broker

This project's architecture is built around making new brokers cheap to add.
A new broker should be **one new folder** under `src/brokers/` plus a single
line in `src/index.ts` to register it. You should not need to touch the
domain models, the registry, the cross-broker analytics, or any other broker.

If you find yourself editing those — the abstraction is leaking. Fix the
abstraction first, then add the broker.

---

## What you need before starting

- Read access to the broker's API documentation (auth scheme, base URLs for
  demo vs live, paginated endpoints, rate-limit headers).
- A demo / paper account with API credentials. Never commit credentials, never
  paste them into chat — pass them via `user_config` in `manifest.json` and
  read from `process.env` in `src/index.ts`.
- Confidence that the broker's read-only endpoints cover at least:
  account summary, positions, transactions, dividends. Pies / baskets are
  optional (declared via `BrokerCapabilities.pies`).

---

## Step 1 — Empirical discovery

Before writing any code, learn the **real shapes** of the broker's API
responses. Don't trust documentation alone — capture actual JSON.

Write a throwaway script under `/tmp` (not in the repo) that:

1. Tries every auth scheme the docs hint at (raw key in `Authorization`,
   `Bearer <key>`, `Basic base64(id:secret)`) until one returns 200.
2. Hits each endpoint you plan to map, with sane query params (e.g.
   `?limit=10` for paginated history).
3. Saves full bodies somewhere local (not in the repo).

Notes from the Trading 212 buildout:
- Errors of `401` mean the auth header format is wrong. Errors of `403` mean
  the format is right but the key lacks a scope — different problem.
- Watch the rate-limit headers (`x-ratelimit-period`, `x-ratelimit-remaining`,
  `x-ratelimit-reset`). Some endpoints give 1 request per second; others 5
  per minute. Pace your discovery script accordingly.

---

## Step 2 — Folder layout

Create `src/brokers/<id>/`:

```
src/brokers/<id>/
├── schemas.ts   Zod schemas for raw API responses
├── client.ts    HTTP client with auth + retry
├── index.ts     IBroker implementation + mappers (raw → domain)
└── tools.ts     MCP tool definitions for broker-specific operations
```

`<id>` is the short broker identifier (`t212`, `etoro`, `ibkr`, etc.). It is
also used as the prefix for broker-specific MCP tools (`t212_get_positions`).

---

## Step 3 — schemas.ts

For every endpoint you call, define a Zod schema that exactly mirrors the
fields you read. Do **not** use `.passthrough()`. Do **not** mark fields as
`.optional()` unless they are genuinely optional in the wire format — making
fields optional to "be safe" hides drift.

If a particular field's shape is uncertain (e.g. you have no test data with
that field populated), make it optional and add a one-line comment naming the
endpoint and noting it is unverified. Sample fixtures captured during
discovery will fill the gap later.

Pagination wrappers are common — extract a generic `pageOf(item)` helper.

---

## Step 4 — client.ts

Single class, e.g. `Trading212Client`. Responsibilities:

- Build the `Authorization` header from credentials.
- Resolve base URL from environment (demo vs live).
- Single `getJson(path, schema)` method that:
  - Issues the request.
  - Maps `401` → `AuthError`, `403` → `AuthError` with a message naming the
    missing scope, `429` → `RateLimitError` (read `Retry-After`), other 4xx/5xx
    → `BrokerApiError`.
  - Validates the body via the supplied Zod schema, mapping parse failures to
    `ValidationError` (with `cause` set to the Zod error).
  - Retries network errors and 429 responses up to a small fixed cap with
    exponential backoff.

Do not log credentials or full responses. Do not import `axios` — `fetch` is
built into Node.

---

## Step 5 — index.ts (the broker class)

Implement `IBroker` from `src/brokers/base.ts`:

```ts
export class MyBroker implements IBroker {
  readonly id = "myb"
  readonly name = "My Broker"
  readonly capabilities: BrokerCapabilities = {
    pies: false,
    dividends: true,
    transactions: true,
  }

  async authenticate(config: BrokerConfig): Promise<void> { ... }
  async getAccount(): Promise<Account> { ... }
  async getPositions(): Promise<readonly Position[]> { ... }
  async getTransactions(opts: PageOpts): Promise<Page<Transaction>> { ... }
  async getDividends(opts: PageOpts): Promise<Page<Dividend>> { ... }
  // Optional, only if capabilities.pies === true:
  // getPies?(): Promise<readonly Pie[]>
  // getPie?(id: string): Promise<PieDetails>
}
```

Mapper functions are exported as plain functions (not class methods) so
contract tests can drive them with fixtures without instantiating the broker.
Cursor-based pagination — extract just the cursor query parameter from the
broker's `nextPagePath` (if any) so domain consumers see an opaque string,
not a path.

---

## Step 6 — tools.ts

For every broker-specific operation, define a `ToolBinding` (definition + handler).

- Tool names are snake_case with broker prefix: `myb_get_positions`,
  `myb_get_account`, `myb_search_instrument`, etc.
- The `description` is what Claude sees and uses to decide when to call. Be
  explicit, name the parameters, mention scope requirements.
- Validate `args` with Zod via `parseArgs` from `src/tools/result.ts`. Wrap
  the broker call in `safeRun` to convert exceptions into a uniform error
  shape.
- For paginated tools, accept `{ limit, cursor }` and pass through.

Export a single factory:

```ts
export function createMyBrokerTools(broker: MyBroker): readonly ToolBinding[] { ... }
```

---

## Step 7 — Wire it up

In `src/index.ts`, after configuring existing brokers:

```ts
const myKey = process.env["MYB_API_KEY"]
if (myKey !== undefined) {
  const broker = new MyBroker()
  await broker.authenticate({ environment, credentials: { MYB_API_KEY: myKey } })
  register(broker, createMyBrokerTools(broker))
}
```

Add the `MYB_API_KEY` field to `manifest.json` under `user_config` with
`"sensitive": true` so Claude Desktop stores it in the OS keychain.

---

## Step 8 — Tests

- **Schema tests** (`tests/contract/<id>/schemas.test.ts`): for each endpoint,
  load a sanitized fixture from `tests/fixtures/<id>/` and `safeParse` it
  against the schema. The fixture should be a snapshot of a real response with
  identifiers replaced (account ids, transaction references, etc.) but
  publicly-known values (tickers, ISINs, currencies) kept as-is.
- **Mapper tests** (`tests/contract/<id>/mappers.test.ts`): drive each mapper
  function with a parsed fixture, assert the resulting domain object field by
  field. Aim for at least one happy-path case per mapper.

Cross-broker analytics tools already have their own tests using mock brokers
(`tests/helpers/fake-broker.ts`); they will exercise your broker through
`IBroker` automatically once it is registered. You don't need to write
analytics tests for new brokers.

---

## Step 9 — Verify

Run all gates locally before opening a PR:

```
npm run typecheck
npm run lint
npm run test
npm audit --audit-level=high
mcpb validate manifest.json
```

Then a manual smoke through MCP Inspector with real credentials:

```
MYB_API_KEY=… ENVIRONMENT=demo npm run inspect
```

Inspector should list all your `myb_*` tools alongside the existing
`portfolio_*` cross-broker tools, and each one should return live data.

---

## Pro-tier brokers (crypto)

Crypto and other Pro data sources are gated by the license tier, and the gate
**fails open**: a broker or tool with no `tier` defaults to free
(`broker.tier ?? "free"` in `src/license/gate.ts` and `src/brokers/registry.ts`).
So a new crypto adapter shipped without the flag would hand out Pro data for
free even with the paywall armed — a revenue leak. If your broker is Pro, set
`readonly tier = "pro" as const` on the `IBroker` class **and** `tier: "pro"` on
every Pro `ToolBinding` it exports. See Bybit (`src/brokers/bybit/index.ts`,
`src/brokers/bybit/tools.ts`) and the crypto wallet broker
(`src/brokers/crypto/index.ts`, `src/brokers/crypto/tools.ts`) for the pattern.

---

## Adding a chain to the crypto adapter

The crypto broker (`src/brokers/crypto/`) reads many chains behind one
"Wallet addresses" field, so it has its own sub-registry that mirrors the broker
registry. Adding a chain is **one folder plus one line** — you should not need to
touch the broker, the parser, or any other chain.

1. **Detector** — `src/brokers/crypto/chains/<id>/detect.ts` exports
   `(raw: string) => boolean`, true only when `raw` is a well-formed address of
   that chain. Validate by decoding + checksum, never by leading characters;
   reuse the codecs in `src/brokers/crypto/codec.ts` (base58 / base58check /
   bech32+bech32m / base64url / CRC-16) or add one there with canonical vectors.
2. **Keyless reader** — a `(address: string) => Promise<RawHolding[]>` reading
   balances from a **public, keyless** endpoint via the shared `fetchJson` in
   `src/brokers/crypto/http.ts` (it backs off on 5xx + 429). Reuse an existing
   reader when the API shape matches (Esplora for BTC/LTC, blockcypher for Doge)
   instead of writing a new one. A single UTXO address is not a whole HD
   wallet — xpub expansion is out of scope.
3. **Register** — add one `{ id, detect, read }` line to `CHAINS` in
   `src/brokers/crypto/registry.ts` and widen `RawHolding["chain"]` in
   `types.ts`. A chain may register `detect` without `read` while its reader is
   pending; such addresses are surfaced to the user as "unsupported", not dropped.
4. **Symbols & prices** — token symbols resolve through the keyless Jupiter
   resolver (`tokens.ts`); USD prices come from DefiLlama (`prices.ts`) keyed by
   each holding's `coinId`.
5. **Tests** — detector vectors in `tests/contract/crypto/detect.test.ts` (real
   public addresses, or synthetic-but-valid ones cross-checked through the
   decoders) and a mapper test against a synthetic fixture; verify the reader
   live against a known address before relying on it.

---

## Anti-patterns

These should NOT be needed when adding a broker. If they are, stop and fix
the abstraction first:

- Editing any other broker's folder.
- Editing `src/brokers/registry.ts`, `src/brokers/base.ts`, `src/domain/*`,
  or anything in `src/tools/analytics/`.
- Adding new MCP request handlers in `src/server.ts`.
- Adding new env vars outside the manifest's `user_config`.
- Importing `dotenv` or any other config library — credentials always come
  from `process.env` populated by the MCPB user_config.
- Catching exceptions inside the broker class to "soften" errors. Throw
  typed errors from `src/utils/errors.ts`; let `safeRun` in `tools.ts` shape
  them for MCP.
