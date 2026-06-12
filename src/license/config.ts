// Master paywall switch.
//
// IRON RULE (spec 2026-06-12-pro-licensing-design.md §1): this constant MUST
// stay `false` in every public release until a purchase channel exists
// (website + merchant of record). While `false`, a standard build behaves
// exactly like today's releases: every tool works for everyone, there are no
// Pro markers, no license network calls, and no license state file.
// Flipping it to `true` is the single code change that arms the paywall.
export const PAYWALL_ENABLED = false
