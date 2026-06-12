import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { controlPlaneCheck } from "../../src/control-plane.js"
import { _resetLicensingForTests, initLicensing } from "../../src/license/manager.js"

describe("controlPlaneCheck (license seam)", () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "fenek-seam-"))
    process.env["FENEK_STATE_DIR"] = dir
    _resetLicensingForTests()
  })
  afterEach(() => {
    delete process.env["FENEK_STATE_DIR"]
    rmSync(dir, { recursive: true, force: true })
    _resetLicensingForTests()
  })

  it("resolves to undefined and makes no network call while the paywall is off", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression -- intentional: test asserts resolved value is undefined
    const result = await controlPlaneCheck()
    expect(result).toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it("warms the license verdict through the seam when the paywall is armed", async () => {
    const validate = vi.fn(() => Promise.resolve({ kind: "valid" as const }))
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: "key-1",
      provider: { validate },
    })
    await controlPlaneCheck()
    expect(validate).toHaveBeenCalledTimes(1)
  })

  it("stays silent without a key even when the paywall is armed", async () => {
    const validate = vi.fn(() => Promise.resolve({ kind: "valid" as const }))
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: undefined,
      provider: { validate },
    })
    await controlPlaneCheck()
    expect(validate).not.toHaveBeenCalled()
  })

  it("a provider that rejects (contract violation) is swallowed, not crashed on", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: "key-1",
      provider: { validate: () => Promise.reject(new Error("network blew up")) },
    })
    await expect(controlPlaneCheck()).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
