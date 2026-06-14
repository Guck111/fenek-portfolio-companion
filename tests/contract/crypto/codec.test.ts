import { describe, it, expect } from "vitest"

import {
  base58Decode,
  base58checkDecode,
  base64UrlToBytes,
  crc16Xmodem,
  decodeSegwitAddress,
  keccak256,
} from "../../../src/brokers/crypto/codec.js"

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")
}

describe("base58Decode (Bitcoin alphabet)", () => {
  it("decodes canonical base58 vectors", () => {
    expect(base58Decode("2g")).toEqual(new Uint8Array([0x61]))
    expect(base58Decode("a3gV")).toEqual(new Uint8Array([0x62, 0x62, 0x62]))
    expect(base58Decode("aPEr")).toEqual(new Uint8Array([0x63, 0x63, 0x63]))
    expect(base58Decode("ABnLTmg")).toEqual(new Uint8Array([0x51, 0x6b, 0x6f, 0xcd, 0x0f]))
  })

  it("maps leading '1' characters to leading zero bytes", () => {
    expect(base58Decode("1")).toEqual(new Uint8Array([0x00]))
    expect(base58Decode("1111111111")).toEqual(new Uint8Array(10))
  })

  it("decodes an empty string to zero bytes", () => {
    expect(base58Decode("")).toEqual(new Uint8Array(0))
  })

  it("rejects characters outside the alphabet (0, O, I, l)", () => {
    expect(base58Decode("0")).toBeNull()
    expect(base58Decode("O")).toBeNull()
    expect(base58Decode("I")).toBeNull()
    expect(base58Decode("l")).toBeNull()
  })

  it("rejects whitespace and punctuation", () => {
    expect(base58Decode("a3 gV")).toBeNull()
    expect(base58Decode("hello+world")).toBeNull()
  })
})

describe("base58checkDecode", () => {
  it("decodes a valid payload and verifies the checksum", () => {
    // Bitcoin genesis coinbase address (P2PKH, version byte 0x00).
    const decoded = base58checkDecode("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")
    expect(decoded).not.toBeNull()
    expect(decoded?.version).toBe(0x00)
    expect(decoded?.payload.length).toBe(20)
  })

  it("returns null when the checksum does not match", () => {
    // Same address with the last character flipped: still base58, bad checksum.
    expect(base58checkDecode("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb")).toBeNull()
  })

  it("returns null for non-base58 input", () => {
    expect(base58checkDecode("not valid base58!")).toBeNull()
  })

  it("returns null for input too short to hold a checksum", () => {
    expect(base58checkDecode("2g")).toBeNull()
  })
})

describe("decodeSegwitAddress (bech32 / bech32m)", () => {
  it("decodes a v0 P2WPKH mainnet address (bech32, BIP-173 vector)", () => {
    const a = decodeSegwitAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")
    expect(a).not.toBeNull()
    expect(a?.hrp).toBe("bc")
    expect(a?.version).toBe(0)
    expect(a?.program.length).toBe(20)
  })

  it("decodes a v1 taproot mainnet address (bech32m, BIP-350 vector)", () => {
    const a = decodeSegwitAddress("bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0")
    expect(a).not.toBeNull()
    expect(a?.hrp).toBe("bc")
    expect(a?.version).toBe(1)
    expect(a?.program.length).toBe(32)
  })

  it("accepts all-uppercase but rejects mixed case", () => {
    expect(decodeSegwitAddress("BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4")).not.toBeNull()
    expect(decodeSegwitAddress("bc1QW508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toBeNull()
  })

  it("rejects a corrupted checksum", () => {
    expect(decodeSegwitAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5")).toBeNull()
  })

  it("rejects strings with no separator or non-charset data", () => {
    expect(decodeSegwitAddress("notbech32atall")).toBeNull()
    expect(decodeSegwitAddress("bc1bbbbbbbbbbbb")).toBeNull()
  })
})

describe("crc16Xmodem", () => {
  it("matches the canonical CRC-16/XMODEM check value for '123456789'", () => {
    const data = new TextEncoder().encode("123456789")
    expect(crc16Xmodem(data)).toBe(0x31c3)
  })
})

describe("base64UrlToBytes", () => {
  it("decodes url-safe base64 to bytes", () => {
    expect(base64UrlToBytes("AAAA")).toEqual(new Uint8Array([0, 0, 0]))
    expect(base64UrlToBytes("____")).toEqual(new Uint8Array([0xff, 0xff, 0xff]))
  })

  it("returns null for characters outside the base64url alphabet", () => {
    expect(base64UrlToBytes("not base64!")).toBeNull()
  })
})

describe("keccak256 (Ethereum Keccak, not NIST SHA3)", () => {
  const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s)

  it("hashes the empty input to the canonical Keccak-256 digest", () => {
    expect(toHex(keccak256(new Uint8Array(0)))).toBe(
      "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
    )
  })

  it("hashes 'abc' to its canonical Keccak-256 digest (differs from SHA3-256)", () => {
    // SHA3-256('abc') would be 3a985da7…; this must be the original-Keccak value.
    expect(toHex(keccak256(utf8("abc")))).toBe(
      "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45",
    )
  })

  it("always returns a 32-byte digest, including across the rate boundary", () => {
    // 135/136/137 bytes straddle the 136-byte rate — exercises the pad10*1
    // boundary where the 0x01 and 0x80 pad bits can land in the same byte.
    for (const len of [0, 1, 135, 136, 137, 200]) {
      expect(keccak256(utf8("a".repeat(len))).length).toBe(32)
    }
  })

  it("produces distinct digests when only the second absorb block differs", () => {
    // Same first 136 bytes, different tail → a correct multi-block absorb must
    // fold the later block in, so the digests cannot collide.
    const head = "a".repeat(136)
    expect(toHex(keccak256(utf8(head + "x")))).not.toBe(toHex(keccak256(utf8(head + "y"))))
  })
})
