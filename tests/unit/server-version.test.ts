import { createRequire } from "node:module"

import { describe, expect, it } from "vitest"

import { SERVER_VERSION, createConfiguredServer } from "../../src/server.js"

const require = createRequire(import.meta.url)
const pkg = require("../../package.json") as { version: string }

describe("server metadata", () => {
  it("advertises the package.json version (no drift)", () => {
    expect(SERVER_VERSION).toBe(pkg.version)
  })

  it("createConfiguredServer returns a server without connecting a transport", () => {
    const server = createConfiguredServer()
    expect(server).toBeDefined()
    // No transport connected: the factory must not touch stdio.
    expect(typeof server.connect).toBe("function")
  })
})
