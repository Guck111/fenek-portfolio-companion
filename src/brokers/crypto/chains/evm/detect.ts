import { keccak256 } from "../../codec.js"

/**
 * EVM ("0x…") address detection for the whole EVM family (Ethereum + L2s).
 *
 * An address is `0x` followed by 40 hex digits. All-lowercase and all-uppercase
 * forms carry no checksum, so they are accepted as-is. A mixed-case form must
 * satisfy the EIP-55 keccak-256 checksum — the form MetaMask exports — so a
 * mistyped checksummed address is rejected rather than read as someone else's
 * wallet. `0x`+40hex collides with no other chain's format, so routing stays
 * unambiguous.
 */

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

export function detectEvm(raw: string): boolean {
  if (!EVM_ADDRESS_RE.test(raw)) return false
  const hex = raw.slice(2)
  // No mixed case → no checksum is present, so there is nothing to verify.
  if (hex === hex.toLowerCase() || hex === hex.toUpperCase()) return true
  return hex === eip55Checksum(hex.toLowerCase())
}

/**
 * Apply the EIP-55 mixed-case checksum to a 40-char lowercase hex address: each
 * character is uppercased where the matching nibble of keccak256(address-ascii)
 * is ≥ 8 (a no-op for the digits 0–9).
 */
function eip55Checksum(lowerHex: string): string {
  const hash = keccak256(new TextEncoder().encode(lowerHex))
  let out = ""
  for (let i = 0; i < lowerHex.length; i++) {
    const ch = lowerHex.charAt(i)
    const byte = hash[i >> 1] ?? 0
    const nibble = (i & 1) === 0 ? byte >> 4 : byte & 0x0f
    out += nibble >= 8 ? ch.toUpperCase() : ch
  }
  return out
}
