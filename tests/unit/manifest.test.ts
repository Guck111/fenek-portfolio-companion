import { createRequire } from "node:module"

import { describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)
const manifest = require("../../manifest.json") as {
  user_config: Record<string, { title?: string; required?: boolean }>
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
})
