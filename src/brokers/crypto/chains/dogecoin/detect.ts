import { base58checkDecode } from "../../codec.js"

/** Dogecoin P2PKH addresses ("D…") are base58check with version byte 0x1e over a 20-byte hash160. */
const DOGECOIN_P2PKH_VERSION = 0x1e
const HASH160_BYTES = 20

export function detectDogecoin(raw: string): boolean {
  const decoded = base58checkDecode(raw)
  return (
    decoded !== null &&
    decoded.version === DOGECOIN_P2PKH_VERSION &&
    decoded.payload.length === HASH160_BYTES
  )
}
