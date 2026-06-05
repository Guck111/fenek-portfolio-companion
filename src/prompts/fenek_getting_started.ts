import type { PromptBinding } from "../brokers/base.js"

// Onboarding briefing. Used by both the prompt below and the tool-form
// (src/tools/getting_started.ts) so prompt-less clients can reach it too. It is
// registered unconditionally and needs no credentials, so a user can run it
// right after install — before configuring anything. The text is an instruction
// to the model (it relays the briefing in the user's own language).
export const GETTING_STARTED_TEXT = `The user has just installed or is setting up the Fenek Portfolio Companion extension and wants to understand it. Give them a concise, friendly getting-started briefing, in their language, covering:

- What it is: a strictly READ-ONLY companion that reads the user's portfolio across Trading 212, on-chain Solana and TON wallets, and Bybit, and helps analyze it. It never places trades, moves funds, or gives buy/sell/rebalance advice — it surfaces data and neutral metrics; decisions stay with the user.
- What can be connected (ALL OPTIONAL — set up only the sources you have, in Settings → Extensions → Fenek Portfolio Companion):
  - Trading 212 — a READ-ONLY API key + secret (Trading 212 app: Settings → API (Beta)). Gives positions, pies, dividends, cash transactions, and order history.
  - Crypto wallets — paste your public wallet addresses into one field (any separator; the chain of each is detected automatically). Solana and TON holdings are read keyless — no API key needed — valued in USD, plus open Jupiter limit orders on Solana.
  - Bybit — a READ-ONLY API key + secret (Account/Wallet read only; no Trade, no Withdraw). Gives coin balances and open orders.
- What you can ask once connected: total value and breakdown by currency, your largest positions, concentration by ticker across accounts, overlap between pies, dividend history, and open orders. Different currencies are reported side by side and never summed (no FX conversion).
- Privacy and safety: everything runs locally on your machine, API keys are stored in your operating system's keychain, there is zero telemetry, and the only outbound network traffic is to the provider APIs you configured.
- Language: you can talk to me in any language — just write in it and I will reply in kind.

Keep it brief. If nothing is configured yet, tell the user to open the extension settings and add at least one source to begin.`

export function createGettingStartedPrompt(): PromptBinding {
  return {
    prompt: {
      name: "fenek_getting_started",
      description:
        "Explains what Fenek Portfolio Companion does, which sources it supports (Trading 212, Solana, TON, Bybit), and how to configure them. Needs no API keys — run it before setting anything up.",
    },
    handler: () =>
      Promise.resolve({
        messages: [{ role: "user", content: { type: "text", text: GETTING_STARTED_TEXT } }],
      }),
  }
}
