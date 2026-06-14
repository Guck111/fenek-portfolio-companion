import { describe, it, expect, vi, afterEach } from "vitest"

import { IbkrFlexClient, mapFlexError } from "../../../src/brokers/ibkr/client.js"
import { AuthError, BrokerApiError, RateLimitError } from "../../../src/utils/errors.js"

const noSleep = (): Promise<void> => Promise.resolve()

const sendSuccess = (ref = "123", url = "https://gdcdyn.example/GetStatement"): string =>
  `<FlexStatementResponse><Status>Success</Status><ReferenceCode>${ref}</ReferenceCode><Url>${url}</Url></FlexStatementResponse>`
const sendFail = (code: string): string =>
  `<FlexStatementResponse><Status>Fail</Status><ErrorCode>${code}</ErrorCode><ErrorMessage>error ${code}</ErrorMessage></FlexStatementResponse>`
const queryDone = `<FlexQueryResponse><FlexStatements count="1"><FlexStatement accountId="U0"/></FlexStatements></FlexQueryResponse>`

const isSendRequest = (call: readonly unknown[]): boolean =>
  String(call[0]).includes("/SendRequest")
const isGetStatement = (call: readonly unknown[]): boolean =>
  String(call[0]).includes("GetStatement")

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("mapFlexError", () => {
  it("maps token/account/IP/setup codes to AuthError (user-fixable, retrying won't help)", () => {
    // token: 1011/1012/1013/1015; user setup of query/account/request: 1014/1016/1020
    for (const code of ["1011", "1012", "1013", "1015", "1014", "1016", "1020"]) {
      expect(mapFlexError(code, "x")).toBeInstanceOf(AuthError)
    }
  })
  it("maps 1018 to RateLimitError", () => {
    expect(mapFlexError("1018", "x")).toBeInstanceOf(RateLimitError)
  })
  it("maps genuine broker-side codes (not available / legacy / reference) to BrokerApiError", () => {
    for (const code of ["1003", "1010", "1017"]) {
      expect(mapFlexError(code, "x")).toBeInstanceOf(BrokerApiError)
    }
  })
})

describe("IbkrFlexClient.fetchStatementXml", () => {
  it("runs the two-step flow and returns the completed statement", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        new Response(
          url.includes("/SendRequest") ? sendSuccess("REF9", "https://x/GetStatement") : queryDone,
          { status: 200 },
        ),
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const client = new IbkrFlexClient({ token: "T", queryId: "Q" }, noSleep)
    const xml = await client.fetchStatementXml()

    expect(xml).toContain("FlexQueryResponse")
    const calls = fetchMock.mock.calls
    expect(String(calls[0]?.[0])).toContain("/SendRequest")
    // step 2 honors the <Url> returned by step 1 and uses the ReferenceCode as q
    expect(String(calls[1]?.[0])).toContain("https://x/GetStatement")
    expect(String(calls[1]?.[0])).toContain("q=REF9")
  })

  it("polls GetStatement while generation is in progress (1019), without re-sending", async () => {
    let getCount = 0
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/SendRequest")) {
        return Promise.resolve(new Response(sendSuccess(), { status: 200 }))
      }
      getCount += 1
      return Promise.resolve(
        new Response(getCount < 2 ? sendFail("1019") : queryDone, { status: 200 }),
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = new IbkrFlexClient({ token: "T", queryId: "Q" }, noSleep)
    const xml = await client.fetchStatementXml()

    expect(xml).toContain("FlexQueryResponse")
    expect(fetchMock.mock.calls.filter(isSendRequest)).toHaveLength(1) // SendRequest once
    expect(getCount).toBe(2) // GetStatement polled twice
  })

  it("throws BrokerApiError when generation never completes (poll cap)", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        new Response(url.includes("/SendRequest") ? sendSuccess() : sendFail("1019"), {
          status: 200,
        }),
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const client = new IbkrFlexClient({ token: "T", queryId: "Q" }, noSleep)
    await expect(client.fetchStatementXml()).rejects.toBeInstanceOf(BrokerApiError)
  })

  it("surfaces a SendRequest auth failure without calling GetStatement", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        new Response(url.includes("/SendRequest") ? sendFail("1015") : queryDone, { status: 200 }),
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const client = new IbkrFlexClient({ token: "T", queryId: "Q" }, noSleep)
    await expect(client.fetchStatementXml()).rejects.toBeInstanceOf(AuthError)
    expect(fetchMock.mock.calls.filter(isGetStatement)).toHaveLength(0)
  })

  it("sends a User-Agent header on every request", async () => {
    const seen: (string | null)[] = []
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      seen.push(new Headers(init?.headers).get("user-agent"))
      return Promise.resolve(
        new Response(url.includes("/SendRequest") ? sendSuccess() : queryDone, { status: 200 }),
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = new IbkrFlexClient({ token: "T", queryId: "Q" }, noSleep)
    await client.fetchStatementXml()

    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every((ua) => ua !== null && ua.length > 0)).toBe(true)
  })

  it("surfaces a persistent throttle (1018) as a RateLimitError, not a generic timeout", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        new Response(url.includes("/SendRequest") ? sendSuccess() : sendFail("1018"), {
          status: 200,
        }),
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const client = new IbkrFlexClient({ token: "T", queryId: "Q" }, noSleep)
    await expect(client.fetchStatementXml()).rejects.toBeInstanceOf(RateLimitError)
  })

  it("wraps a network failure into a typed BrokerApiError", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError("fetch failed")))
    vi.stubGlobal("fetch", fetchMock)

    const client = new IbkrFlexClient({ token: "T", queryId: "Q" }, noSleep)
    await expect(client.fetchStatementXml()).rejects.toBeInstanceOf(BrokerApiError)
  })
})
