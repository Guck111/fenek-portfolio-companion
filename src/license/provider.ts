export type LicenseVerdict =
  | { readonly kind: "valid"; readonly validUntil?: string }
  | { readonly kind: "revoked" }
  | { readonly kind: "unreachable" }

// Merchant-of-record abstraction. The merchant (Polar / Lemon Squeezy / …)
// is deliberately undecided; the first real adapter arrives with the Pro
// release as a thin mapper of one POST request. Mapping rules for adapters:
// - "revoked" ONLY when the license server explicitly answered that the key
//   is invalid, expired, or disabled (e.g. a 4xx with a definite body).
// - Timeouts, DNS errors, 5xx, and unparsable bodies are all "unreachable".
// - validate() never throws — it always resolves to a verdict.
export interface LicenseProvider {
  validate(key: string): Promise<LicenseVerdict>
}
