import { afterEach, describe, expect, it, vi } from "vitest"

import { createPolarProvider, POLAR_PRODUCTION_CONFIG } from "../../src/license/polar.js"

const CONFIG = {
  baseUrl: "https://sandbox-api.polar.sh",
  organizationId: "e66b1d43-cf8b-4848-bbdf-299f83229a27",
}

function stubFetch(
  impl: (url: string, init: RequestInit) => Response | Promise<Response>,
): ReturnType<typeof vi.fn> {
  const fn = vi.fn(impl)
  vi.stubGlobal("fetch", fn)
  return fn
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

describe("createPolarProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("maps a granted key to valid", async () => {
    stubFetch(() => jsonResponse({ status: "granted" }))
    const verdict = await createPolarProvider(CONFIG).validate("key-1")
    expect(verdict).toEqual({ kind: "valid" })
  })

  it("treats a granted key with a null expiry as valid without a bound", async () => {
    stubFetch(() => jsonResponse({ status: "granted", expires_at: null }))
    const verdict = await createPolarProvider(CONFIG).validate("key-1")
    expect(verdict).toEqual({ kind: "valid" })
  })

  it("passes through the expiry of a granted key", async () => {
    stubFetch(() => jsonResponse({ status: "granted", expires_at: "2026-07-12T00:00:00Z" }))
    const verdict = await createPolarProvider(CONFIG).validate("key-1")
    expect(verdict).toEqual({ kind: "valid", validUntil: "2026-07-12T00:00:00Z" })
  })

  it.each(["revoked", "disabled", "expired"])("maps a %s key to revoked", async (status) => {
    stubFetch(() => jsonResponse({ status }))
    const verdict = await createPolarProvider(CONFIG).validate("key-1")
    expect(verdict).toEqual({ kind: "revoked" })
  })

  it("treats an unknown status as unreachable rather than trusting it", async () => {
    stubFetch(() => jsonResponse({ status: "something-new" }))
    const verdict = await createPolarProvider(CONFIG).validate("key-1")
    expect(verdict).toEqual({ kind: "unreachable" })
  })

  it("treats a 200 with an unexpected shape as unreachable", async () => {
    stubFetch(() => jsonResponse({ unexpected: true }))
    const verdict = await createPolarProvider(CONFIG).validate("key-1")
    expect(verdict).toEqual({ kind: "unreachable" })
  })

  it("maps 404 (no such key in this organization) to revoked", async () => {
    stubFetch(() => jsonResponse({ error: "NotFound" }, 404))
    const verdict = await createPolarProvider(CONFIG).validate("key-1")
    expect(verdict).toEqual({ kind: "revoked" })
  })

  it("treats an ambiguous 403 as unreachable, not a revoke", async () => {
    stubFetch(() => jsonResponse({ error: "Forbidden" }, 403))
    const verdict = await createPolarProvider(CONFIG).validate("key-1")
    expect(verdict).toEqual({ kind: "unreachable" })
  })

  it("treats a 5xx as unreachable", async () => {
    stubFetch(() => jsonResponse({ error: "boom" }, 503))
    const verdict = await createPolarProvider(CONFIG).validate("key-1")
    expect(verdict).toEqual({ kind: "unreachable" })
  })

  it("treats a network failure as unreachable, never throwing", async () => {
    stubFetch(() => Promise.reject(new Error("ECONNRESET")))
    const verdict = await createPolarProvider(CONFIG).validate("key-1")
    expect(verdict).toEqual({ kind: "unreachable" })
  })

  it("treats an unreadable body as unreachable", async () => {
    stubFetch(() => new Response("<<not json>>", { status: 200 }))
    const verdict = await createPolarProvider(CONFIG).validate("key-1")
    expect(verdict).toEqual({ kind: "unreachable" })
  })

  it("POSTs the key and public org id to the customer-portal endpoint with no secret header", async () => {
    const fetchMock = stubFetch(() => jsonResponse({ status: "granted" }))
    await createPolarProvider(CONFIG).validate("secret-key-xyz")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://sandbox-api.polar.sh/v1/customer-portal/license-keys/validate")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body as string)).toEqual({
      key: "secret-key-xyz",
      organization_id: "e66b1d43-cf8b-4848-bbdf-299f83229a27",
    })
    expect(init.headers).not.toHaveProperty("authorization")
    expect(init.headers).not.toHaveProperty("Authorization")
  })
})

describe("POLAR_PRODUCTION_CONFIG", () => {
  // Guards the armed paywall: a release must validate against the real Polar API
  // with a real org id, never the sandbox or a placeholder left in by mistake.
  it("targets the production Polar API, not the sandbox", () => {
    expect(POLAR_PRODUCTION_CONFIG.baseUrl).toBe("https://api.polar.sh")
    expect(POLAR_PRODUCTION_CONFIG.baseUrl).not.toContain("sandbox")
  })

  it("carries a real organization UUID, not a placeholder", () => {
    expect(POLAR_PRODUCTION_CONFIG.organizationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })
})

// Live end-to-end check against Polar's sandbox. Skipped unless POLAR_SMOKE_KEY
// is set, so CI and normal runs never touch the network. Run manually with a
// real sandbox license key to confirm the response shape:
//   POLAR_SMOKE_KEY=<sandbox-key> npx vitest run license-polar
const SMOKE_KEY = process.env["POLAR_SMOKE_KEY"]

describe("createPolarProvider (live sandbox smoke)", () => {
  it.skipIf(SMOKE_KEY === undefined)(
    "returns a definite verdict for a real sandbox key",
    async () => {
      if (SMOKE_KEY === undefined) return // unreachable under skipIf; narrows the type
      const verdict = await createPolarProvider(CONFIG).validate(SMOKE_KEY)
      // Surfaces the real verdict so schema drift is caught by eye.
      console.error(`polar sandbox verdict: ${JSON.stringify(verdict)}`)
      expect(["valid", "revoked"]).toContain(verdict.kind)
    },
  )
})
