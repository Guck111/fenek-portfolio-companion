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

// --- Keccak-256 (Ethereum Keccak, NOT NIST SHA3-256) -----------------------
//
// EIP-55 address checksums hash the lowercase hex string with Keccak-256. Node's
// crypto exposes "sha3-256", but that applies the NIST padding (0x06); Ethereum
// kept the original Keccak padding (0x01), so the two digests disagree. This is a
// small, dependency-free Keccak-f[1600] sponge. It runs once per address, so the
// readable BigInt-lane form is preferred over a faster 32-bit-split version.

const KECCAK_ROUNDS = 24
const KECCAK_RATE_BYTES = 136 // 1600-bit state − 2×256-bit capacity = 1088-bit rate
const KECCAK_OUTPUT_BYTES = 32
const LANE_MASK = (1n << 64n) - 1n

const KECCAK_ROUND_CONSTANTS: readonly bigint[] = [
  0x0000000000000001n,
  0x0000000000008082n,
  0x800000000000808an,
  0x8000000080008000n,
  0x000000000000808bn,
  0x0000000080000001n,
  0x8000000080008081n,
  0x8000000000008009n,
  0x000000000000008an,
  0x0000000000000088n,
  0x0000000080008009n,
  0x000000008000000an,
  0x000000008000808bn,
  0x800000000000008bn,
  0x8000000000008089n,
  0x8000000000008003n,
  0x8000000000008002n,
  0x8000000000000080n,
  0x000000000000800an,
  0x800000008000000an,
  0x8000000080008081n,
  0x8000000000008080n,
  0x0000000080000001n,
  0x8000000080008008n,
]

// Cumulative rotation offsets r[t] = ((t+1)(t+2)/2) mod 64 along the ρ/π walk.
const KECCAK_RHO: readonly number[] = [
  1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14, 27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44,
]

/** Read a lane, satisfying noUncheckedIndexedAccess; the state is always full. */
function lane(state: readonly bigint[], i: number): bigint {
  return state[i] ?? 0n
}

/** Rotate a 64-bit lane left by n bits. */
function rotl64(x: bigint, n: number): bigint {
  const s = BigInt(n)
  return ((x << s) | (x >> (64n - s))) & LANE_MASK
}

/** The Keccak-f[1600] permutation, in place over 25 lanes (lane[x][y] = state[x + 5y]). */
function keccakF(state: bigint[]): void {
  for (let round = 0; round < KECCAK_ROUNDS; round++) {
    // θ — column parity, then diffuse into every lane.
    const c: bigint[] = []
    for (let x = 0; x < 5; x++) {
      c[x] =
        lane(state, x) ^
        lane(state, x + 5) ^
        lane(state, x + 10) ^
        lane(state, x + 15) ^
        lane(state, x + 20)
    }
    for (let x = 0; x < 5; x++) {
      const d = lane(c, (x + 4) % 5) ^ rotl64(lane(c, (x + 1) % 5), 1)
      for (let y = 0; y < 25; y += 5) state[x + y] = lane(state, x + y) ^ d
    }
    // ρ + π — rotate and scatter lanes along the (x, y) walk.
    let x = 1
    let y = 0
    let current = lane(state, 1)
    for (let t = 0; t < 24; t++) {
      const newX = y
      y = (2 * x + 3 * y) % 5
      x = newX
      const idx = x + 5 * y
      const tmp = lane(state, idx)
      state[idx] = rotl64(current, KECCAK_RHO[t] ?? 0)
      current = tmp
    }
    // χ — non-linear mix across each row.
    for (let row = 0; row < 25; row += 5) {
      const r0 = lane(state, row)
      const r1 = lane(state, row + 1)
      const r2 = lane(state, row + 2)
      const r3 = lane(state, row + 3)
      const r4 = lane(state, row + 4)
      state[row] = r0 ^ (~r1 & LANE_MASK & r2)
      state[row + 1] = r1 ^ (~r2 & LANE_MASK & r3)
      state[row + 2] = r2 ^ (~r3 & LANE_MASK & r4)
      state[row + 3] = r3 ^ (~r4 & LANE_MASK & r0)
      state[row + 4] = r4 ^ (~r0 & LANE_MASK & r1)
    }
    // ι — break round symmetry.
    state[0] = lane(state, 0) ^ (KECCAK_ROUND_CONSTANTS[round] ?? 0n)
  }
}

/**
 * Keccak-256 of arbitrary bytes (the hash behind EIP-55 address checksums). Pure,
 * dependency-free; uses original-Keccak padding, distinct from NIST SHA3-256.
 */
export function keccak256(data: Uint8Array): Uint8Array {
  const state: bigint[] = new Array<bigint>(25).fill(0n)

  // pad10*1: append 0x01, zero-fill to a rate multiple, set the final byte's top
  // bit. When a single byte remains, the two pad bits share it (0x01 ^ 0x80 = 0x81).
  const padLen = KECCAK_RATE_BYTES - (data.length % KECCAK_RATE_BYTES)
  const padded = new Uint8Array(data.length + padLen)
  padded.set(data)
  padded[data.length] = (padded[data.length] ?? 0) ^ 0x01
  padded[padded.length - 1] = (padded[padded.length - 1] ?? 0) ^ 0x80

  // Absorb each rate-sized block as little-endian 64-bit lanes.
  for (let offset = 0; offset < padded.length; offset += KECCAK_RATE_BYTES) {
    for (let i = 0; i < KECCAK_RATE_BYTES / 8; i++) {
      let value = 0n
      for (let b = 7; b >= 0; b--) {
        value = (value << 8n) | BigInt(padded[offset + i * 8 + b] ?? 0)
      }
      state[i] = lane(state, i) ^ value
    }
    keccakF(state)
  }

  // Squeeze: 32 output bytes fit inside the first rate block, no re-permute needed.
  const out = new Uint8Array(KECCAK_OUTPUT_BYTES)
  for (let i = 0; i < KECCAK_OUTPUT_BYTES / 8; i++) {
    let value = lane(state, i)
    for (let b = 0; b < 8; b++) {
      out[i * 8 + b] = Number(value & 0xffn)
      value >>= 8n
    }
  }
  return out
}
