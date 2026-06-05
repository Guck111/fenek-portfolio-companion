import { describe, it, expect } from "vitest"

import { detectDogecoin } from "../../../src/brokers/crypto/chains/dogecoin/detect.js"
import { detectSolana } from "../../../src/brokers/crypto/chains/solana/detect.js"
import { detectChain } from "../../../src/brokers/crypto/registry.js"

describe("detectSolana", () => {
  it("accepts base58 strings that decode to 32 bytes", () => {
    // System Program (32 zero bytes) and the USDC SPL mint — both 32-byte pubkeys.
    expect(detectSolana("11111111111111111111111111111111")).toBe(true)
    expect(detectSolana("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe(true)
  })

  it("rejects a base58check address that decodes to 25 bytes", () => {
    expect(detectSolana("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(false)
  })

  it("rejects non-base58, empty, and wrong-length input", () => {
    expect(detectSolana("0x52908400098527886E0F7030069857D2E4169EE7")).toBe(false)
    expect(detectSolana("not-an-address")).toBe(false)
    expect(detectSolana("")).toBe(false)
  })
})

describe("detectDogecoin", () => {
  it("accepts a base58check P2PKH address with Dogecoin's version byte (0x1e)", () => {
    expect(detectDogecoin("DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L")).toBe(true)
    expect(detectDogecoin("DBs4WcRE7eysKwRxHNX88XZVCQ9M6QSUSz")).toBe(true)
  })

  it("rejects base58check addresses of other chains (different version byte)", () => {
    expect(detectDogecoin("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(false) // BTC 0x00
    expect(detectDogecoin("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")).toBe(false) // Tron 0x41
    expect(detectDogecoin("LhK2kQwiaAvhjWY799cZvMyYwnQAcxkarr")).toBe(false) // LTC 0x30
  })

  it("rejects a Solana address and outright garbage", () => {
    expect(detectDogecoin("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe(false)
    expect(detectDogecoin("garbage")).toBe(false)
  })
})

describe("detectChain", () => {
  it("routes a Solana address to 'solana'", () => {
    expect(detectChain("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe("solana")
  })

  it("routes a Dogecoin address to 'dogecoin'", () => {
    expect(detectChain("DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L")).toBe("dogecoin")
  })

  it("returns null when no registered chain recognises the address", () => {
    expect(detectChain("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBeNull() // BTC — not yet registered
    expect(detectChain("0x52908400098527886E0F7030069857D2E4169EE7")).toBeNull() // EVM
    expect(detectChain("complete garbage !!!")).toBeNull()
  })
})
