// Master paywall switch.
//
// DISARMED since 0.8.0: Fenek Portfolio Companion is free for everyone. Every
// tool (including the crypto sources) works without a license key, the
// license server is never contacted, and no license state file is written.
//
// The licensing code (manager, Polar provider, gate, texts) is intentionally
// kept and stays covered by tests that arm it explicitly via initLicensing().
// Flipping this back to `true` re-arms the paywall on a standard build: Pro
// sources (crypto) would again require a valid key. A `freepro` build ignores
// this switch entirely (see manager.ts `isPaywallActive`).
export const PAYWALL_ENABLED = false
