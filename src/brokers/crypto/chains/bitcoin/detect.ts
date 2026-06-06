import { base58checkDecode, decodeSegwitAddress } from "../../codec.js"

/**
 * Bitcoin: legacy base58check P2PKH ("1…", version 0x00) / P2SH ("3…", 0x05)
 * over a 20-byte hash160, plus native SegWit ("bc1…", bech32/bech32m).
 *
 * The legacy P2SH version 0x05 is shared with old Litecoin "3…" addresses; it is
 * claimed here for Bitcoin (the dominant use). Litecoin keeps its own "L…"/"M…".
 */
const BTC_P2PKH_VERSION = 0x00
const BTC_P2SH_VERSION = 0x05
const HASH160_BYTES = 20
const BTC_SEGWIT_HRP = "bc"

export function detectBitcoin(raw: string): boolean {
  const segwit = decodeSegwitAddress(raw)
  if (segwit !== null) return segwit.hrp === BTC_SEGWIT_HRP

  const legacy = base58checkDecode(raw)
  return (
    legacy !== null &&
    legacy.payload.length === HASH160_BYTES &&
    (legacy.version === BTC_P2PKH_VERSION || legacy.version === BTC_P2SH_VERSION)
  )
}
