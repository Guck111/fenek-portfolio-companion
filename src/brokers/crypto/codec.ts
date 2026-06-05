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

// --- bech32 / bech32m (BIP-173 / BIP-350) ----------------------------------

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
/** Final checksum constant: 1 for bech32 (witness v0), 0x2bc830a3 for bech32m (v1+). */
const BECH32_CONST = 1
const BECH32M_CONST = 0x2bc830a3

function bech32Polymod(values: readonly number[]): number {
  const gen = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
  let chk = 1
  for (const value of values) {
    const top = chk >>> 25
    chk = ((chk & 0x1ffffff) << 5) ^ value
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) chk ^= gen[i] ?? 0
    }
  }
  return chk >>> 0
}

function hrpExpand(hrp: string): number[] {
  const high: number[] = []
  const low: number[] = []
  for (let i = 0; i < hrp.length; i++) {
    const c = hrp.charCodeAt(i)
    high.push(c >> 5)
    low.push(c & 31)
  }
  return [...high, 0, ...low]
}

/** Regroup `from`-bit values into `to`-bit values; null if leftover bits are non-zero (no pad). */
function convertBits(data: readonly number[], from: number, to: number): number[] | null {
  let acc = 0
  let bits = 0
  const out: number[] = []
  const maxv = (1 << to) - 1
  for (const value of data) {
    acc = (acc << from) | value
    bits += from
    while (bits >= to) {
      bits -= to
      out.push((acc >> bits) & maxv)
    }
  }
  if (bits >= from || ((acc << (to - bits)) & maxv) !== 0) return null
  return out
}

export interface SegwitAddress {
  readonly hrp: string
  /** Witness version, 0–16. */
  readonly version: number
  /** Decoded witness program bytes. */
  readonly program: Uint8Array
}

/**
 * Decode a segwit (bech32/bech32m) address, verifying the checksum with the
 * scheme required by its witness version (v0 → bech32, v1+ → bech32m) and the
 * BIP-141 program-length rules. Returns hrp/version/program, or `null` if the
 * string is mixed-case, malformed, or fails the checksum. Chains key on `hrp`.
 */
export function decodeSegwitAddress(raw: string): SegwitAddress | null {
  const hasLower = raw !== raw.toUpperCase()
  const hasUpper = raw !== raw.toLowerCase()
  if (hasLower && hasUpper) return null
  const s = raw.toLowerCase()
  if (s.length < 8 || s.length > 90) return null

  const sep = s.lastIndexOf("1")
  if (sep < 1 || s.length - sep - 1 < 6) return null
  const hrp = s.slice(0, sep)

  const values: number[] = []
  for (const ch of s.slice(sep + 1)) {
    const v = BECH32_CHARSET.indexOf(ch)
    if (v === -1) return null
    values.push(v)
  }

  const version = values[0]
  if (version === undefined || version > 16) return null
  const expected = version === 0 ? BECH32_CONST : BECH32M_CONST
  if (bech32Polymod([...hrpExpand(hrp), ...values]) !== expected) return null

  const program = convertBits(values.slice(1, values.length - 6), 5, 8)
  if (program === null || program.length < 2 || program.length > 40) return null
  if (version === 0 && program.length !== 20 && program.length !== 32) return null

  return { hrp, version, program: new Uint8Array(program) }
}

// --- base64url + CRC16 (TON user-friendly addresses) -----------------------

/** CRC-16/XMODEM (poly 0x1021, init 0x0000) — the checksum TON user-friendly addresses carry. */
export function crc16Xmodem(data: Uint8Array): number {
  let crc = 0
  for (const byte of data) {
    crc ^= byte << 8
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc & 0xffff
}

/** Decode url-safe (or standard) base64 to bytes; null if it holds other characters. */
export function base64UrlToBytes(input: string): Uint8Array | null {
  if (!/^[A-Za-z0-9+/_=-]*$/.test(input)) return null
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/")
  return new Uint8Array(Buffer.from(normalized, "base64"))
}
