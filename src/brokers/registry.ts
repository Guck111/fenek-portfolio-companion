import type {
  CallToolResult,
  GetPromptResult,
  Prompt,
  Tool,
} from "@modelcontextprotocol/sdk/types.js"

import type { IBroker, PromptBinding, ToolBinding } from "./base.js"

const brokers = new Map<string, IBroker>()
const tools = new Map<string, ToolBinding>()
const prompts = new Map<string, PromptBinding>()

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
    tools.set(binding.tool.name, binding)
  }
}

export function get(id: string): IBroker | undefined {
  return brokers.get(id)
}

export function list(): readonly IBroker[] {
  return [...brokers.values()]
}

export function listTools(): readonly Tool[] {
  return [...tools.values()].map((b) => b.tool)
}

export function callTool(name: string, args: unknown): Promise<CallToolResult> {
  const binding = tools.get(name)
  if (binding === undefined) {
    return Promise.resolve({
      isError: true,
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
    })
  }
  return binding.handler(args)
}

export function registerTools(toolBindings: readonly ToolBinding[]): void {
  for (const binding of toolBindings) {
    if (tools.has(binding.tool.name)) {
      throw new Error(`Tool name conflict: '${binding.tool.name}' is already registered`)
    }
  }
  for (const binding of toolBindings) {
    tools.set(binding.tool.name, binding)
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
