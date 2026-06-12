# Security Policy

## Reporting a Vulnerability

If you believe you have found a security vulnerability in this project, please **report it privately**. Do not open a public issue, do not post to discussions, do not disclose on social media before coordinated release.

**Preferred channel:** GitHub's private vulnerability reporting.

1. Navigate to the repository's **Security** tab on GitHub.
2. Click **Report a vulnerability**.
3. Provide a description, reproduction steps, affected versions, and any impact analysis you have.

If private vulnerability reporting is not yet enabled on the repository, open a minimal public issue titled "Request private security contact" without any vulnerability details, and a maintainer will arrange a private channel.

## Response Targets

This project is open-source software maintained on a best-effort basis. The targets below are commitments of intent, not service-level guarantees.

| Stage | Target |
|---|---|
| Initial acknowledgement of report | within 72 hours |
| Initial assessment and triage | within 7 days |
| Patched release (where applicable) | within 30 days of confirmation |

Complex issues, supply-chain investigations, or vulnerabilities in upstream dependencies may take longer; in that case the maintainer will keep you informed.

## Scope

**In scope:**

- Source code under `src/` of this repository
- Build, packaging, and release scripts
- The `.mcpb` artifacts published in GitHub Releases or in the Anthropic MCP Directory under this project's name
- Direct dependencies declared in `package.json`
- Documentation that affects security posture (configuration guidance in [README.md](README.md), credential handling in [PRIVACY.md](PRIVACY.md))

**Out of scope:**

- Vulnerabilities in Claude Desktop itself — please report to Anthropic
- Vulnerabilities in broker APIs — please report to the broker
- Issues that require physical access to a user's unlocked machine
- Social engineering of users or maintainers
- Vulnerabilities in transitive dependencies that have no exploitable path through this project's code (please still report so we can update; just expect lower priority)

## Severity We Care About

In rough order of priority:

1. Leakage of API keys, secrets, or user portfolio data outside the configured broker connection
2. Bypass of read-only enforcement — any path that allows the server to make state-changing calls to a broker
3. Code execution outside the documented MCP tool surface
4. Supply-chain integrity issues — compromised dependencies, build artifacts, release pipeline, or signed `.mcpb` bundles
5. Input validation flaws that allow malformed broker responses to crash, hang, or compromise the server

## Coordinated Disclosure

We follow coordinated disclosure. Please give us a reasonable opportunity to release a fix before publishing details. We will credit you in the release notes and the published advisory unless you prefer to remain anonymous.

If we cannot meet a target date, we will tell you, explain why, and propose a revised timeline.

## No Bug Bounty

This project has no bug bounty program and cannot offer monetary rewards. We acknowledge security researchers in release notes when they wish.

## Past Advisories

Published security advisories will be listed in the repository's **Security → Advisories** tab on GitHub.
