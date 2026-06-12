import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ToolBinding } from "../../src/brokers/base.js"
import { callTool, clear, listTools, registerTools } from "../../src/brokers/registry.js"
import { _resetLicensingForTests, initLicensing } from "../../src/license/manager.js"
import { keyFingerprint, writeLicenseState } from "../../src/license/state.js"
import { PRO_TOOL_DESCRIPTION_SUFFIX } from "../../src/license/texts.js"

function binding(name: string, tier?: "free" | "pro"): ToolBinding & { calls: () => number } {
  let calls = 0
  return {
    tool: {
      name,
      description: `${name} description.`,
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    handler: () => {
      calls++
      return Promise.resolve({ content: [{ type: "text" as const, text: "ok" }] })
    },
    ...(tier !== undefined ? { tier } : {}),
    calls: () => calls,
  }
}

describe("registry license gate", () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "fenek-gate-"))
    process.env["FENEK_STATE_DIR"] = dir
    clear()
    _resetLicensingForTests()
  })
  afterEach(() => {
    delete process.env["FENEK_STATE_DIR"]
    rmSync(dir, { recursive: true, force: true })
    clear()
    _resetLicensingForTests()
  })

  it("paywall off: pro tools run and carry no suffix", async () => {
    const pro = binding("bybit_fake", "pro")
    registerTools([pro])
    const result = await callTool("bybit_fake", {})
    expect(result.isError).toBeUndefined()
    expect(pro.calls()).toBe(1)
    const tool = listTools().find((t) => t.name === "bybit_fake")
    expect(tool?.description).toBe("bybit_fake description.")
  })

  it("paywall on without a key: pro tool is denied with the no-key text, handler untouched", async () => {
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: undefined,
      provider: null,
    })
    const pro = binding("bybit_fake", "pro")
    registerTools([pro])
    const result = await callTool("bybit_fake", {})
    expect(result.isError).toBe(true)
    const text = (result.content[0] as { text: string }).text
    expect(text).toContain("fenek.tech")
    expect(text).toContain("No license key")
    expect(pro.calls()).toBe(0)
  })

  it("paywall on without a key: pro tool descriptions get the Pro suffix, free ones do not", () => {
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: undefined,
      provider: null,
    })
    registerTools([
      binding("bybit_fake", "pro"),
      binding("t212_fake", "free"),
      binding("plain_fake"),
    ])
    const tools = listTools()
    const byName = new Map(tools.map((t) => [t.name, t.description]))
    expect(byName.get("bybit_fake")).toBe(`bybit_fake description.${PRO_TOOL_DESCRIPTION_SUFFIX}`)
    expect(byName.get("t212_fake")).toBe("t212_fake description.")
    expect(byName.get("plain_fake")).toBe("plain_fake description.")
    // the suffixing copy must not drop the centrally stamped annotation
    const suffixed = tools.find((t) => t.name === "bybit_fake")
    expect(suffixed?.annotations?.readOnlyHint).toBe(true)
  })

  it("free tools run regardless of license state and never touch the provider", async () => {
    const provider = {
      validate: vi.fn(() => Promise.resolve({ kind: "valid" as const })),
    }
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: undefined,
      provider,
    })
    const free = binding("t212_fake")
    registerTools([free])
    const result = await callTool("t212_fake", {})
    expect(result.isError).toBeUndefined()
    expect(free.calls()).toBe(1)
    expect(provider.validate).not.toHaveBeenCalled()
  })

  it("paywall on with a validating key: pro tool runs", async () => {
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: "key-1",
      provider: { validate: () => Promise.resolve({ kind: "valid" as const }) },
    })
    const pro = binding("bybit_fake", "pro")
    registerTools([pro])
    const result = await callTool("bybit_fake", {})
    expect(result.isError).toBeUndefined()
    expect(pro.calls()).toBe(1)
  })

  it("readOnlyHint stamping is preserved for pro bindings", () => {
    registerTools([binding("bybit_fake", "pro")])
    const tool = listTools().find((t) => t.name === "bybit_fake")
    expect(tool?.annotations?.readOnlyHint).toBe(true)
  })

  it("a valid cached license shows no suffix and runs pro tools", async () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("key-1"),
      lastVerdict: "valid",
      checkedAt: new Date().toISOString(),
    })
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: "key-1",
      provider: null,
    })
    const pro = binding("bybit_fake", "pro")
    registerTools([pro])
    const tool = listTools().find((t) => t.name === "bybit_fake")
    expect(tool?.description).toBe("bybit_fake description.")
    const result = await callTool("bybit_fake", {})
    expect(result.isError).toBeUndefined()
    expect(pro.calls()).toBe(1)
  })

  it("a revoked subscription surfaces the renew text through the registry", async () => {
    writeLicenseState({
      keyFingerprint: keyFingerprint("key-1"),
      lastVerdict: "revoked",
      checkedAt: "2026-06-10T00:00:00.000Z",
    })
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: "key-1",
      provider: { validate: () => Promise.resolve({ kind: "revoked" as const }) },
    })
    const pro = binding("bybit_fake", "pro")
    registerTools([pro])
    const result = await callTool("bybit_fake", {})
    expect(result.isError).toBe(true)
    expect((result.content[0] as { text: string }).text).toContain("Renew")
    expect(pro.calls()).toBe(0)
  })
})
