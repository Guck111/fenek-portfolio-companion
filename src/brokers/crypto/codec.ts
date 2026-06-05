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
