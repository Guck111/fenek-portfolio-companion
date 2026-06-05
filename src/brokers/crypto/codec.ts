import { createHash } from "node:crypto"

/**
 * Address codecs shared by the chain detectors.
 *
 * Pure, dependency-free implementations (base58 today; bech32 / CRC16 land
 * alongside the chains that need them). Detection validates by decoding +
 * checksum, never by guessing from the first characters.
 */

/** Standard base58 alphabet (Bitcoin/Solana/Tron/Doge). XRPL and Polkadot use their own. */
export const BITCOIN_BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

/**
 * Decode a base58 string into bytes, or `null` if it contains a character
 * outside `alphabet`. Leading alphabet[0] characters become leading zero bytes.
 * The alphabet is a parameter so XRPL / Polkadot variants can reuse the math.
 */
export function base58Decode(
  input: string,
  alphabet: string = BITCOIN_BASE58_ALPHABET,
): Uint8Array | null {
  const map = new Map<string, number>()
  for (let i = 0; i < alphabet.length; i++) map.set(alphabet.charAt(i), i)

  // Big-number base conversion 58 -> 256, little-endian accumulator.
  const bytes: number[] = []
  for (const ch of input) {
    let carry = map.get(ch)
    if (carry === undefined) return null
    for (let j = 0; j < bytes.length; j++) {
      carry += (bytes[j] ?? 0) * 58
      bytes[j] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }

  // Leading alphabet[0] symbols are leading zero bytes.
  const zeroChar = alphabet.charAt(0)
  let leadingZeros = 0
  for (const ch of input) {
    if (ch !== zeroChar) break
    leadingZeros++
  }

  const out = new Uint8Array(leadingZeros + bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    out[leadingZeros + i] = bytes[bytes.length - 1 - i] ?? 0
  }
  return out
}

/** Double SHA-256 (the base58check checksum hash) via Node's built-in crypto — no dependency. */
function doubleSha256(data: Uint8Array): Uint8Array {
  const first = createHash("sha256").update(data).digest()
  return new Uint8Array(createHash("sha256").update(first).digest())
}

export interface Base58CheckResult {
  /** Leading version byte — the network/coin discriminator. */
  readonly version: number
  /** Payload after the version byte (e.g. the 20-byte hash160). */
  readonly payload: Uint8Array
}

/**
 * Decode a base58check string, verifying its trailing 4-byte double-SHA-256
 * checksum. Returns the version byte and payload, or `null` if the input is not
 * base58 or the checksum fails. Chains discriminate on `version` + payload length.
 */
export function base58checkDecode(input: string): Base58CheckResult | null {
  const raw = base58Decode(input)
  if (raw === null || raw.length < 5) return null
  const body = raw.subarray(0, raw.length - 4)
  const checksum = raw.subarray(raw.length - 4)
  const expected = doubleSha256(body).subarray(0, 4)
  for (let i = 0; i < 4; i++) {
    if (checksum[i] !== expected[i]) return null
  }
  return { version: body[0] ?? 0, payload: body.subarray(1) }
}
