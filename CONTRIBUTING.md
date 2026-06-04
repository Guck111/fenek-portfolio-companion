# Contributing

Thank you for your interest in contributing.

## Project Scope

This project is a **read-only**, **non-commercial**, open-source MCP server for analyzing brokerage portfolio data. The non-commercial, read-only character is core — it is the basis on which the project remains exempt from regulation as an investment service in EU and US jurisdictions. Contributions that change this character require prior discussion in an issue.

In particular, contributions that **will not** be accepted without prior agreement on threat model and UX:

- Any tool that places, modifies, or cancels orders
- Any tool that transfers funds, deposits, or withdraws
- Any tool that produces personalized buy / sell / rebalance recommendations (the LLM is instructed not to do this; the server must not encourage it)
- Any feature that adds telemetry, analytics, error reporting, or other outbound traffic to non-broker hosts
- Any change that introduces affiliate links, monetization paths, or commercial promotion
- Any new dependency added without justification — supply-chain risk is treated as a first-class concern; pin to exact patch versions

If you have an idea that touches any of the above, **open an issue first** so we can discuss before you spend time on a PR.

## Developer Certificate of Origin (DCO)

All contributions must be signed off under the **Developer Certificate of Origin** version 1.1 (https://developercertificate.org/). The DCO is a lightweight statement that you have the right to contribute the code under the project's license. There is no CLA, nothing to sign separately.

To sign off a commit, add `-s` (or `--signoff`) to your `git commit` command:

```sh
git commit -s -m "your commit message"
```

This appends a `Signed-off-by:` trailer to your commit message. By doing so, you certify the four assertions in the DCO text linked above — most importantly, that your contribution is licensed under the **MIT License** and that you have the right to grant that license.

Pull requests with unsigned commits will be asked to amend before merge.

## Architecture and Conventions

Read [CLAUDE.md](CLAUDE.md) for project context, conventions, and the multi-broker abstraction. The step-by-step guide for adding a new broker lives in [docs/adding-a-broker.md](docs/adding-a-broker.md).

Core rule: when adding a new broker, do not modify `src/brokers/base.ts`, do not modify `src/brokers/registry.ts` other than to register your adapter, and do not modify any other broker's adapter. If you find yourself needing to, the abstraction is leaking — open an issue.

## Code Style

- TypeScript strict mode, no `any`
- Pin all dependencies to exact patch versions (no `^` or `~`)
- Validate every external API response with Zod — never trust an API blindly
- `console.error()` only for diagnostics; `stdout` is reserved for the MCP protocol
- Tool descriptions use third person and data verbs (`fetch`, `compute`, `analyze`, `show`, `list`). **Never** use `recommend`, `suggest`, `signal`, `should`, or any other word that frames output as advice — these are scanned for in review

## Local Development

```sh
npm install
npm run dev          # tsx watch
npm run inspect      # MCP Inspector against local server
npm run pack:local   # build .mcpb and install into local Claude Desktop
```

Before opening a PR, run:

```sh
npm run typecheck
npm run lint
npm run test
npm run audit
```

CI runs the same checks.

## Reporting Security Issues

Do **not** file public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for the private reporting channel.

## License of Contributions

By submitting a contribution, you license it to the project under the [MIT License](LICENSE), as attested by your DCO sign-off.
