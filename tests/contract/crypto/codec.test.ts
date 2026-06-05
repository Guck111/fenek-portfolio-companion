import { describe, it, expect } from "vitest"

import { base58Decode, base58checkDecode } from "../../../src/brokers/crypto/codec.js"

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
