import { base64UrlToBytes, crc16Xmodem } from "../../codec.js"

/**
 * TON user-friendly address: 48 base64url characters decoding to 36 bytes
 * [tag | workchain | hash(32) | crc16(2)], with a CRC-16/XMODEM over the first
 * 34 bytes. Both bounceable (EQ…) and non-bounceable (UQ…) forms validate here;
 * the CRC, not the prefix, is the check.
 */
const TON_ADDRESS_CHARS = 48
const TON_DECODED_BYTES = 36

export function detectTon(raw: string): boolean {
  if (raw.length !== TON_ADDRESS_CHARS) return false
  const bytes = base64UrlToBytes(raw)
  if (bytes === null) return false
  if (bytes.length !== TON_DECODED_BYTES) return false
  const stored = ((bytes[34] ?? 0) << 8) | (bytes[35] ?? 0)
  return crc16Xmodem(bytes.subarray(0, 34)) === stored
}
