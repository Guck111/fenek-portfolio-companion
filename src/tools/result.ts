import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import type { z } from "zod"

import { toUserMessage } from "../utils/errors.js"

export function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] }
}

export function errorResult(error: unknown): CallToolResult {
  return { isError: true, content: [{ type: "text", text: toUserMessage(error) }] }
}

export async function safeRun<T>(
  fn: () => Promise<T>,
  format: (value: T) => CallToolResult = jsonResult,
): Promise<CallToolResult> {
  try {
    return format(await fn())
  } catch (error) {
    return errorResult(error)
  }
}

export type ParseArgsResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly result: CallToolResult }

export function parseArgs<T extends z.ZodType>(
  schema: T,
  args: unknown,
): ParseArgsResult<z.infer<T>> {
  const parsed = schema.safeParse(args ?? {})
  if (parsed.success) return { ok: true, data: parsed.data }
  return {
    ok: false,
    result: {
      isError: true,
      content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
    },
  }
}
