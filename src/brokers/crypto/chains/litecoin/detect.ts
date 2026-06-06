import { base58checkDecode, decodeSegwitAddress } from "../../codec.js"

/**
 * Litecoin: legacy base58check P2PKH ("L…", version 0x30) / P2SH ("M…", 0x32)
 * over a 20-byte hash160, plus native SegWit ("ltc1…", bech32). The deprecated
 * "3…" P2SH (version 0x05) is shared with Bitcoin and claimed there, not here.
 */
const LTC_P2PKH_VERSION = 0x30
const LTC_P2SH_VERSION = 0x32
const HASH160_BYTES = 20
const LTC_SEGWIT_HRP = "ltc"

export function detectLitecoin(raw: string): boolean {
  const segwit = decodeSegwitAddress(raw)
  if (segwit !== null) return segwit.hrp === LTC_SEGWIT_HRP

  const legacy = base58checkDecode(raw)
  return (
    legacy !== null &&
    legacy.payload.length === HASH160_BYTES &&
    (legacy.version === LTC_P2PKH_VERSION || legacy.version === LTC_P2SH_VERSION)
  )
}
