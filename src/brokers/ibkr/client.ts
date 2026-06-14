import { BUILD_VERSION } from "../../generated/build-info.js"
import { AuthError, BrokerApiError, RateLimitError } from "../../utils/errors.js"

import { parseSendRequestEnvelope, statementRootName } from "./xml.js"

const USER_AGENT = `fenek-portfolio-companion/${BUILD_VERSION}`

const BROKER_ID = "ibkr"
// Host honored from the <Url> returned by SendRequest for step 2; this base is
// only the SendRequest entry point. ndcdyn/gdcdyn are not authoritatively pinned
// per step — see spec §15.
const FLEX_BASE = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService"
const FLEX_VERSION = "3"
const REQUEST_TIMEOUT_MS = 30_000
const MAX_POLLS = 5
const IN_PROGRESS_DELAY_MS = 5_000
const THROTTLE_DELAY_MS = 10_000

// Error codes that mean "not ready yet, poll again" on GetStatement. 1018 is the
// per-token throttle (longer backoff). Everything else is terminal.
const RETRY_CODES = new Set([
  "1001",
  "1004",
  "1005",
  "1006",
  "1007",
  "1008",
  "1009",
  "1018",
  "1019",
  "1021",
])
const AUTH_CODES = new Set(["1011", "1012", "1013", "1015"])

const AUTH_MESSAGES: Readonly<Record<string, string>> = {
  1011: "IBKR Flex service account is inactive.",
  1012: "IBKR Flex token has expired — regenerate it in Client Portal → Settings → Account Settings → Flex Web Service.",
  1013: "IBKR Flex request blocked by the token's IP restriction — clear the 'Valid For IP Address' field on the token, or add the calling IP.",
  1015: "IBKR Flex token is invalid — regenerate it in Client Portal → Settings → Account Settings → Flex Web Service.",
}

export function mapFlexError(code: string, message: string): Error {
  if (AUTH_CODES.has(code)) {
    return new AuthError(
      AUTH_MESSAGES[code] ?? `IBKR Flex authorization failed (error ${code})`,
      BROKER_ID,
    )
  }
  if (code === "1018") {
    return new RateLimitError(
      `IBKR Flex is throttling requests (error 1018).`,
      BROKER_ID,
      THROTTLE_DELAY_MS,
    )
  }
  return new BrokerApiError(`${message} (Flex error ${code})`, BROKER_ID)
}

export interface IbkrFlexConfig {
  readonly token: string
  readonly queryId: string
}

function realSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class IbkrFlexClient {
  private readonly token: string
  private readonly queryId: string
  private readonly sleep: (ms: number) => Promise<void>

  constructor(config: IbkrFlexConfig, sleep: (ms: number) => Promise<void> = realSleep) {
    if (config.token.length === 0 || config.queryId.length === 0) {
      throw new AuthError("IBKR Flex token and query id are required", BROKER_ID)
    }
    this.token = config.token
    this.queryId = config.queryId
    this.sleep = sleep
  }

  // Runs the full two-step Flex flow and returns the completed FlexQueryResponse
  // XML. Polls GetStatement (never re-issuing SendRequest) until generation
  // finishes or the poll cap is hit.
  async fetchStatementXml(): Promise<string> {
    const sendUrl = `${FLEX_BASE}/SendRequest?t=${encodeURIComponent(this.token)}&q=${encodeURIComponent(this.queryId)}&v=${FLEX_VERSION}`
    const sendEnvelope = parseSendRequestEnvelope(await this.httpGet(sendUrl))
    if (sendEnvelope.status !== "Success") {
      throw mapFlexError(
        sendEnvelope.errorCode ?? "",
        sendEnvelope.errorMessage ?? "IBKR Flex SendRequest failed",
      )
    }
    const { referenceCode, url } = sendEnvelope
    if (referenceCode === undefined || url === undefined) {
      throw new BrokerApiError("IBKR Flex SendRequest returned no reference code or URL", BROKER_ID)
    }

    const getUrl = `${url}?t=${encodeURIComponent(this.token)}&q=${encodeURIComponent(referenceCode)}&v=${FLEX_VERSION}`
    let lastThrottleMessage: string | undefined
    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      const body = await this.httpGet(getUrl)
      if (statementRootName(body) === "FlexQueryResponse") return body

      // Otherwise it is a FlexStatementResponse: still generating, or an error.
      const poll = parseSendRequestEnvelope(body)
      const code = poll.errorCode ?? ""
      if (!RETRY_CODES.has(code)) {
        throw mapFlexError(code, poll.errorMessage ?? "IBKR Flex GetStatement failed")
      }
      if (code === "1018") lastThrottleMessage = poll.errorMessage ?? ""
      await this.sleep(code === "1018" ? THROTTLE_DELAY_MS : IN_PROGRESS_DELAY_MS)
    }
    // A throttle that never cleared is a rate-limit, not a generation timeout — keep
    // the RateLimitError directive (wait and retry) rather than a do-not-loop error.
    if (lastThrottleMessage !== undefined) throw mapFlexError("1018", lastThrottleMessage)
    throw new BrokerApiError("IBKR Flex statement generation timed out after polling", BROKER_ID)
  }

  private async httpGet(url: string): Promise<string> {
    let res: Response
    try {
      res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        redirect: "error",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch {
      // Network failure (fetch → TypeError) or timeout (AbortSignal → DOMException).
      // The URL carries the token, so it is never included in the error message.
      throw new BrokerApiError("IBKR Flex is unreachable (network error or timeout)", BROKER_ID)
    }
    if (res.status === 401 || res.status === 403) {
      throw new AuthError("IBKR Flex rejected the token", BROKER_ID)
    }
    if (res.status === 429) {
      throw new RateLimitError("IBKR Flex rate limit exceeded", BROKER_ID, THROTTLE_DELAY_MS)
    }
    if (!res.ok) {
      throw new BrokerApiError(`IBKR Flex request failed`, BROKER_ID, res.status)
    }
    return res.text()
  }
}
