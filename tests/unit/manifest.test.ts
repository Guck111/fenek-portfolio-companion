import { createRequire } from "node:module"

import { describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)
const manifest = require("../../manifest.json") as {
  user_config: Record<
    string,
    { title?: string; description?: string; required?: boolean; sensitive?: boolean }
  >
  server: { mcp_config: { env: Record<string, string> } }
}

describe("manifest user_config", () => {
  const configKeys = Object.keys(manifest.user_config)
  const envMap = manifest.server.mcp_config.env

  it("has at least one configurable field", () => {
    expect(configKeys.length).toBeGreaterThan(0)
  })

  it("maps every user_config key into the server env (no orphan fields)", () => {
    for (const key of configKeys) {
      expect(envMap[key], `${key} is not wired into server.mcp_config.env`).toBe(
        `\${user_config.${key}}`,
      )
    }
  })

  it("marks no field as required, so a user can configure only the sources they have", () => {
    for (const key of configKeys) {
      expect(manifest.user_config[key]?.required ?? false, `${key} must not be required`).toBe(
        false,
      )
    }
  })

  it("gives every field a human-readable title", () => {
    for (const key of configKeys) {
      const title = manifest.user_config[key]?.title
      expect(typeof title === "string" && title.length > 0, `${key} needs a title`).toBe(true)
    }
  })

  it("exposes no license key field (free for everyone; nothing to unlock)", () => {
    expect(configKeys).not.toContain("LICENSE_KEY")
    expect(Object.keys(envMap)).not.toContain("LICENSE_KEY")
  })

  it("mentions no paid plan or license in any field description", () => {
    for (const key of configKeys) {
      const description = manifest.user_config[key]?.description ?? ""
      expect(description, `${key} still mentions a paid plan`).not.toMatch(
        /Fenek Pro|license|subscri/i,
      )
    }
  })

  it("advertises Ethereum / EVM auto-detection on the wallet-addresses field", () => {
    const description = manifest.user_config["WALLET_ADDRESSES"]?.description ?? ""
    expect(description).toContain("Ethereum")
    expect(description).toContain("EVM")
  })
})
