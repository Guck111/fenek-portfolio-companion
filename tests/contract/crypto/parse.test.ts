import { describe, it, expect } from "vitest"

import { parseAddresses } from "../../../src/brokers/crypto/parse.js"

describe("parseAddresses", () => {
  it("splits a comma-separated list", () => {
    expect(parseAddresses("aaa,bbb,ccc")).toEqual(["aaa", "bbb", "ccc"])
  })

  it("splits on spaces", () => {
    expect(parseAddresses("aaa bbb ccc")).toEqual(["aaa", "bbb", "ccc"])
  })

  it("splits on newlines", () => {
    expect(parseAddresses("aaa\nbbb\nccc")).toEqual(["aaa", "bbb", "ccc"])
  })

  it("splits on semicolons", () => {
    expect(parseAddresses("aaa;bbb;ccc")).toEqual(["aaa", "bbb", "ccc"])
  })

  it("splits on a mix of delimiters in one field", () => {
    expect(parseAddresses("aaa, bbb\nccc;ddd\teee")).toEqual(["aaa", "bbb", "ccc", "ddd", "eee"])
  })

  it("collapses repeated delimiters and trims surrounding whitespace", () => {
    expect(parseAddresses("  aaa ,,  bbb  \n\n ccc ; ; ")).toEqual(["aaa", "bbb", "ccc"])
  })

  it("handles Windows CRLF line endings", () => {
    expect(parseAddresses("aaa\r\nbbb")).toEqual(["aaa", "bbb"])
  })

  it("dedupes exact repeats, preserving first-seen order", () => {
    expect(parseAddresses("aaa, bbb, aaa, ccc, bbb")).toEqual(["aaa", "bbb", "ccc"])
  })

  it("returns an empty array for an empty string", () => {
    expect(parseAddresses("")).toEqual([])
  })

  it("returns an empty array for delimiters/whitespace only", () => {
    expect(parseAddresses("  ,\n; \t ")).toEqual([])
  })

  it("returns a single address unchanged", () => {
    expect(parseAddresses("Av6FrBHoGL9Eau6WCydCZFKQV2SZAbDGkvg7gobmCJcV")).toEqual([
      "Av6FrBHoGL9Eau6WCydCZFKQV2SZAbDGkvg7gobmCJcV",
    ])
  })

  it("preserves case — addresses are case-sensitive, EVM casing is resolved later", () => {
    expect(parseAddresses("0xAbC, 0xabc")).toEqual(["0xAbC", "0xabc"])
  })
})
