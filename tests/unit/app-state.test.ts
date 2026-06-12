import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { readStateFile, resolveStateDir, writeStateFile } from "../../src/utils/app-state.js"

const Schema = z.object({ marker: z.string() })

describe("app-state file helpers", () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "fenek-state-"))
    process.env["FENEK_STATE_DIR"] = dir
  })
  afterEach(() => {
    delete process.env["FENEK_STATE_DIR"]
    rmSync(dir, { recursive: true, force: true })
  })

  it("honors the FENEK_STATE_DIR override", () => {
    expect(resolveStateDir()).toBe(dir)
  })

  it("returns undefined when the file is missing", () => {
    expect(readStateFile("nope.json", Schema)).toBeUndefined()
  })

  it("round-trips state through disk", () => {
    writeStateFile("s.json", { marker: "hello" })
    expect(readStateFile("s.json", Schema)).toEqual({ marker: "hello" })
  })

  it("returns undefined on corrupt JSON", () => {
    writeFileSync(join(dir, "bad.json"), "{not json")
    expect(readStateFile("bad.json", Schema)).toBeUndefined()
  })

  it("returns undefined on schema mismatch", () => {
    writeFileSync(join(dir, "shape.json"), JSON.stringify({ marker: 7 }))
    expect(readStateFile("shape.json", Schema)).toBeUndefined()
  })

  it("swallows write failures instead of throwing", () => {
    process.env["FENEK_STATE_DIR"] = join(dir, "file-not-dir")
    writeFileSync(join(dir, "file-not-dir"), "occupied")
    expect(() => {
      writeStateFile("s.json", { marker: "x" })
    }).not.toThrow()
  })

  it("writes into the configured dir", () => {
    writeStateFile("s.json", { marker: "scoped" })
    expect(readFileSync(join(dir, "s.json"), "utf8")).toContain("scoped")
  })
})
