// Schema-mismatch dumps end up on stderr, which Claude Desktop persists to a
// plaintext mcp-server-*.log on disk. Some payloads echo credentials back
// (Bybit GET /v5/user/query-api returns the API key itself), so anything we
// dump must have credential-bearing fields redacted and a hard size cap.

const SENSITIVE_KEYS = new Set(["apikey", "apisecret", "secret", "ips", "note"])
const MAX_DUMP_CHARS = 2000

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? "[redacted]" : redact(child)
    }
    return out
  }
  return value
}

// JSON dump of an API payload that is safe to write to the MCP server log.
export function sanitizeForLog(value: unknown): string {
  // JSON.stringify(undefined) yields undefined at runtime despite the string typing.
  const json = JSON.stringify(redact(value)) as string | undefined
  if (json === undefined) return "undefined"
  if (json.length <= MAX_DUMP_CHARS) return json
  return `${json.slice(0, MAX_DUMP_CHARS)} ... [truncated ${json.length - MAX_DUMP_CHARS} chars]`
}
