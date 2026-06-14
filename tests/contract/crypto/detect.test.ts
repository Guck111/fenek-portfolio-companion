import { describe, it, expect } from "vitest"

import { detectBitcoin } from "../../../src/brokers/crypto/chains/bitcoin/detect.js"
import { detectDogecoin } from "../../../src/brokers/crypto/chains/dogecoin/detect.js"
import { detectEvm } from "../../../src/brokers/crypto/chains/evm/detect.js"
import { detectLitecoin } from "../../../src/brokers/crypto/chains/litecoin/detect.js"
import { detectSolana } from "../../../src/brokers/crypto/chains/solana/detect.js"
import { detectTon } from "../../../src/brokers/crypto/chains/ton/detect.js"
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
    expect(detectDogecoin("LQJ9N8d4pVLLpH9JbaxRskQXnivbCrSZuc")).toBe(false) // LTC 0x30
  })

  it("rejects a Solana address and outright garbage", () => {
    expect(detectDogecoin("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe(false)
    expect(detectDogecoin("garbage")).toBe(false)
  })
})

describe("detectBitcoin", () => {
  it("accepts legacy P2PKH (0x00) and P2SH (0x05) base58check addresses", () => {
    expect(detectBitcoin("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(true)
    expect(detectBitcoin("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy")).toBe(true)
  })

  it("accepts bech32 P2WPKH and bech32m taproot 'bc1' addresses", () => {
    expect(detectBitcoin("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toBe(true)
    expect(detectBitcoin("bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0")).toBe(
      true,
    )
  })

  it("rejects a valid segwit address on another network (testnet 'tb1')", () => {
    expect(detectBitcoin("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")).toBe(false)
  })

  it("rejects base58check addresses of other chains and garbage", () => {
    expect(detectBitcoin("DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L")).toBe(false) // Dogecoin 0x1e
    expect(detectBitcoin("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe(false) // Solana
    expect(detectBitcoin("garbage")).toBe(false)
  })
})

describe("detectTon", () => {
  it("accepts a user-friendly TON address with a valid CRC16", () => {
    expect(detectTon("UQA5jmXrFi47-xvbqld9L2ah8udriH_kSYgozqhX69VeolFc")).toBe(true)
  })

  it("rejects a TON address whose checksum no longer matches", () => {
    expect(detectTon("UQA5jmXrFi47-xvbqld9L2ah8udriH_kSYgozqhX69VeolFd")).toBe(false)
  })

  it("rejects addresses of other chains and wrong length", () => {
    expect(detectTon("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe(false) // Solana
    expect(detectTon("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(false) // Bitcoin
    expect(detectTon("garbage")).toBe(false)
  })
})

describe("detectLitecoin", () => {
  it("accepts legacy P2PKH (L, 0x30) and P2SH (M, 0x32) addresses", () => {
    expect(detectLitecoin("LQJ9N8d4pVLLpH9JbaxRskQXnivbCrSZuc")).toBe(true)
    expect(detectLitecoin("MQYud2L2pTHZ2uGc9RCqLJiTDauRzqGx92")).toBe(true)
  })

  it("accepts native segwit 'ltc1' addresses", () => {
    expect(detectLitecoin("ltc1qqypqxpq9qcrsszg2pvxq6rs0zqg3yyc5dyg36p")).toBe(true)
  })

  it("rejects Bitcoin (incl. bc1) and other-chain addresses", () => {
    expect(detectLitecoin("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(false) // BTC 0x00
    expect(detectLitecoin("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toBe(false) // BTC segwit
    expect(detectLitecoin("DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L")).toBe(false) // Dogecoin 0x1e
    expect(detectLitecoin("garbage")).toBe(false)
  })
})

describe("detectEvm", () => {
  it("accepts an all-lowercase address (no checksum to verify)", () => {
    expect(detectEvm("0xde709f2102306220921060314715629080e2fb77")).toBe(true)
    expect(detectEvm("0x27b1fdb04752bbc536007a920d24acb045561c26")).toBe(true)
  })

  it("accepts an all-uppercase address (no checksum to verify)", () => {
    expect(detectEvm("0x52908400098527886E0F7030069857D2E4169EE7")).toBe(true)
    expect(detectEvm("0x8617E340B3D01FA5F11F306F4090FD50E238070D")).toBe(true)
  })

  it("accepts mixed-case addresses with a valid EIP-55 checksum", () => {
    expect(detectEvm("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed")).toBe(true)
    expect(detectEvm("0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359")).toBe(true)
    expect(detectEvm("0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB")).toBe(true)
    expect(detectEvm("0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb")).toBe(true)
  })

  it("rejects a mixed-case address whose EIP-55 checksum is wrong", () => {
    // Valid address with one letter's case flipped (5a… → 5A…): bad checksum.
    expect(detectEvm("0x5AAeb6053F3E94C9b9A09f33669435E7Ef1BeAed")).toBe(false)
    expect(detectEvm("0xD1220a0cf47c7B9Be7A2E6BA89F429762e7b9aDb")).toBe(false)
  })

  it("rejects wrong length, non-hex, and a missing 0x prefix", () => {
    expect(detectEvm("0xde709f2102306220921060314715629080e2fb7")).toBe(false) // 39 hex
    expect(detectEvm("0xde709f2102306220921060314715629080e2fb777")).toBe(false) // 41 hex
    expect(detectEvm("0xde709f2102306220921060314715629080e2fb7g")).toBe(false) // non-hex g
    expect(detectEvm("de709f2102306220921060314715629080e2fb77")).toBe(false) // no 0x
    expect(detectEvm("")).toBe(false)
  })

  it("does not match addresses of the other chains", () => {
    expect(detectEvm("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe(false) // Solana
    expect(detectEvm("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(false) // Bitcoin
    expect(detectEvm("UQA5jmXrFi47-xvbqld9L2ah8udriH_kSYgozqhX69VeolFc")).toBe(false) // TON
  })
})

describe("detectChain", () => {
  it("routes an address to the chain whose validator accepts it", () => {
    expect(detectChain("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe("solana")
    expect(detectChain("DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L")).toBe("dogecoin")
    expect(detectChain("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe("bitcoin")
    expect(detectChain("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toBe("bitcoin")
    expect(detectChain("UQA5jmXrFi47-xvbqld9L2ah8udriH_kSYgozqhX69VeolFc")).toBe("ton")
    expect(detectChain("MQYud2L2pTHZ2uGc9RCqLJiTDauRzqGx92")).toBe("litecoin")
    expect(detectChain("0x52908400098527886E0F7030069857D2E4169EE7")).toBe("evm")
  })

  it("returns null when no registered chain recognises the address", () => {
    expect(detectChain("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")).toBeNull() // testnet
    expect(detectChain("complete garbage !!!")).toBeNull()
  })
})
