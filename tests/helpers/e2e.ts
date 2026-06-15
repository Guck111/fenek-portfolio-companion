import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { vi, type Mock } from "vitest"

import { createConfiguredServer } from "../../src/server.js"
import { _resetForTests as resetUpdateNoticeLatch } from "../../src/utils/update-check.js"

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures")

// Loads a raw provider-response fixture as parsed JSON (e.g. "t212/positions.json").
export function loadFixture(relPath: string): unknown {
  return JSON.parse(loadFixtureText(relPath))
}

// Loads a fixture as text — for non-JSON bodies such as the IBKR Flex XML.
export function loadFixtureText(relPath: string): string {
  return fs.readFileSync(path.join(fixturesDir, relPath), "utf8")
}

interface FetchRoute {
  // Matched against the request URL: substring (string) or pattern (RegExp).
  readonly when: string | RegExp
  readonly status?: number
  readonly json?: unknown
  readonly text?: string
  readonly headers?: Readonly<Record<string, string>>
}

// Stubs global fetch with a URL-routed responder for hermetic protocol-boundary
// tests. A request whose URL matches no route REJECTS loudly, so a test fails
// fast if the code under test reaches an endpoint the test did not anticipate —
// the inverse of a permissive mock that silently hides an extra call.
export function installFetchRouter(routes: readonly FetchRoute[]): Mock {
  const fetchMock = vi.fn((input: string | URL | Request): Promise<Response> => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    const route = routes.find((r) =>
      typeof r.when === "string" ? url.includes(r.when) : r.when.test(url),
    )
    if (route === undefined) {
      return Promise.reject(new Error(`e2e fetch router: unexpected request to ${url}`))
    }
    const body = route.text ?? (route.json !== undefined ? JSON.stringify(route.json) : "")
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...route.headers,
    }
    return Promise.resolve(new Response(body, { status: route.status ?? 200, headers }))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

interface E2EHarness {
  readonly client: Client
  readonly close: () => Promise<void>
}

// Wires a real MCP Client to the fully-configured server over an in-process
// linked transport. This is a TRUE protocol-boundary harness: listTools /
// callTool travel through MCP request/response serialization via
// createConfiguredServer, but everything runs in one process so global fetch
// stays stubbable. Register brokers/tools and configure licensing BEFORE
// calling this — the server reads the registry at request time and snapshots
// its instructions when built.
export async function connectE2EClient(): Promise<E2EHarness> {
  // Clear the process-global update-notice latch so each harness session starts
  // clean — otherwise whether appendUpdateNotice fires becomes order-dependent
  // across tests once the build date ages past the no-network age window.
  resetUpdateNoticeLatch()
  const server = createConfiguredServer()
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: "e2e-client", version: "0.0.0" }, { capabilities: {} })
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return {
    client,
    close: async (): Promise<void> => {
      await client.close()
      await server.close()
    },
  }
}

// Points app-state (update/license state files) at a throwaway temp dir so e2e
// runs never read or write the developer's real state directory. Returns a
// disposer that restores the previous value.
export function useHermeticStateDir(): () => void {
  const prev = process.env["FENEK_STATE_DIR"]
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fenek-e2e-"))
  process.env["FENEK_STATE_DIR"] = dir
  return () => {
    if (prev === undefined) delete process.env["FENEK_STATE_DIR"]
    else process.env["FENEK_STATE_DIR"] = prev
  }
}
