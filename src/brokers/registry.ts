import type {
  CallToolResult,
  GetPromptResult,
  Prompt,
  Tool,
} from "@modelcontextprotocol/sdk/types.js"

import type { IBroker, PromptBinding, ToolBinding } from "./base.js"
import { BUILD_DATE, BUILD_VERSION } from "../generated/build-info.js"
import { ensureProAccess, getTier } from "../license/manager.js"
import { PRO_TOOL_DESCRIPTION_SUFFIX, proDenialText } from "../license/texts.js"
import { getUpdateNotice, isReminderLatched, readUpdateState } from "../utils/update-check.js"

const brokers = new Map<string, IBroker>()
const tools = new Map<string, ToolBinding>()
const prompts = new Map<string, PromptBinding>()

// Single chokepoint for storing a tool. This server is strictly read-only by
// design, so `readOnlyHint` is stamped here centrally — an adapter cannot forget
// it, and a binding cannot override it to false. A human-readable `title`
// declared on the tool is preserved as-is.
function setTool(binding: ToolBinding): void {
  const tool: Tool = {
    ...binding.tool,
    annotations: { ...binding.tool.annotations, readOnlyHint: true },
  }
  tools.set(tool.name, { ...binding, tool })
}

export function register(broker: IBroker, toolBindings: readonly ToolBinding[] = []): void {
  if (brokers.has(broker.id)) {
    throw new Error(`Broker '${broker.id}' is already registered`)
  }
  for (const binding of toolBindings) {
    if (tools.has(binding.tool.name)) {
      throw new Error(`Tool name conflict: '${binding.tool.name}' is already registered`)
    }
  }
  brokers.set(broker.id, broker)
  for (const binding of toolBindings) {
    setTool(binding)
  }
}

export function get(id: string): IBroker | undefined {
  return brokers.get(id)
}

export function list(): readonly IBroker[] {
  return [...brokers.values()]
}

export function listTools(): readonly Tool[] {
  return [...tools.values()].map((b) => {
    if ((b.tier ?? "free") === "pro" && getTier() === "free") {
      return {
        ...b.tool,
        description: `${b.tool.description ?? ""}${PRO_TOOL_DESCRIPTION_SUFFIX}`,
      }
    }
    return b.tool
  })
}

export async function callTool(name: string, args: unknown): Promise<CallToolResult> {
  const binding = tools.get(name)
  if (binding === undefined) {
    return {
      isError: true,
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
    }
  }
  if ((binding.tier ?? "free") === "pro") {
    const access = await ensureProAccess()
    if (!access.allowed) {
      return { isError: true, content: [{ type: "text", text: proDenialText(access.reason) }] }
    }
  }
  return appendUpdateNotice(await binding.handler(args))
}

// Appends the once-per-session update nudge to a successful tool result. An
// error result is returned untouched so a failure never carries an unrelated
// notice. Returns null-equivalent (the original) when nothing is due.
export function appendUpdateNotice(result: CallToolResult): CallToolResult {
  // Skip the state-file read entirely once the notice has already fired.
  if (result.isError === true || isReminderLatched()) return result
  const notice = getUpdateNotice(readUpdateState(), {
    buildVersion: BUILD_VERSION,
    buildDate: BUILD_DATE,
  })
  if (notice === null) return result
  return { ...result, content: [...result.content, { type: "text", text: `---\n${notice}` }] }
}

export function registerTools(toolBindings: readonly ToolBinding[]): void {
  for (const binding of toolBindings) {
    if (tools.has(binding.tool.name)) {
      throw new Error(`Tool name conflict: '${binding.tool.name}' is already registered`)
    }
  }
  for (const binding of toolBindings) {
    setTool(binding)
  }
}

export function registerPrompts(promptBindings: readonly PromptBinding[]): void {
  for (const binding of promptBindings) {
    if (prompts.has(binding.prompt.name)) {
      throw new Error(`Prompt name conflict: '${binding.prompt.name}' is already registered`)
    }
  }
  for (const binding of promptBindings) {
    prompts.set(binding.prompt.name, binding)
  }
}

export function listPrompts(): readonly Prompt[] {
  return [...prompts.values()].map((b) => b.prompt)
}

export function getPrompt(
  name: string,
  args: Readonly<Record<string, string>> | undefined,
): Promise<GetPromptResult> {
  const binding = prompts.get(name)
  if (binding === undefined) {
    return Promise.reject(new Error(`Unknown prompt: ${name}`))
  }
  return binding.handler(args)
}

export function clear(): void {
  brokers.clear()
  tools.clear()
  prompts.clear()
}
