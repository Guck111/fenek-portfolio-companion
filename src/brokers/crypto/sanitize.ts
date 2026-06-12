// On-chain token metadata (jetton / SPL symbols) is attacker-controlled: anyone
// can mint a token with an arbitrary symbol and airdrop it to a watched wallet.
// These strings flow into tool results that the model reads, so they must not be
// able to smuggle instruction-like payloads, spoof rendering with bidi/zero-width
// tricks, or bloat the context. Strip what can never be legitimate in a ticker,
// collapse whitespace, and cap the length; callers fall back to an address-derived
// label when nothing printable remains.

const STRIP_RE =
  /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g
const MAX_SYMBOL_CHARS = 32

export function sanitizeSymbol(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  // Collapse whitespace (incl. \n, \t) into single spaces first, then strip the
  // remaining non-whitespace controls — the order keeps word boundaries intact.
  const cleaned = value.replace(/\s+/g, " ").replace(STRIP_RE, "").trim()
  if (cleaned.length === 0) return undefined
  return cleaned.slice(0, MAX_SYMBOL_CHARS)
}
