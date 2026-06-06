import { base58Decode } from "../../codec.js"

/** A Solana address is a base58-encoded 32-byte ed25519 public key (no checksum). */
const SOLANA_PUBKEY_BYTES = 32

export function detectSolana(raw: string): boolean {
  const bytes = base58Decode(raw)
  return bytes !== null && bytes.length === SOLANA_PUBKEY_BYTES
}
