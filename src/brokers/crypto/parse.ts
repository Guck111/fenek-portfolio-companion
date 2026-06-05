/** Any run of whitespace, commas, or semicolons separates one address from the next. */
const DELIMITERS = /[\s,;]+/

/**
 * Split the single "Wallet addresses" field into individual address tokens.
 *
 * Accepts any mix of delimiters (comma, semicolon, spaces, tabs, newlines,
 * CRLF), drops empty fragments from leading/trailing/repeated delimiters, and
 * dedupes preserving first-seen order.
 *
 * Case is preserved on purpose: addresses are case-sensitive on most chains
 * (base58, base64), and EVM checksum casing is normalised later by the chain
 * detector — not here.
 */
export function parseAddresses(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const token of raw.split(DELIMITERS)) {
    if (token.length === 0 || seen.has(token)) continue
    seen.add(token)
    out.push(token)
  }
  return out
}
