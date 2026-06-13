// Master paywall switch.
//
// The purchase channel now exists (website fenek.tech + Polar merchant of
// record), so the paywall is ARMED. On a standard build, Pro sources (crypto)
// require a valid license key; classic brokers (T212) and cross-broker
// analytics stay free. A `freepro` build ignores this switch entirely and never
// gates or talks to the license server (see manager.ts `isPaywallActive`).
//
// Flipping back to `false` instantly disarms the paywall: every tool works for
// everyone, no license network calls, no license state file.
export const PAYWALL_ENABLED = true
