import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import type { z } from "zod"

// Local bookkeeping only (timestamps, cached license verdicts, version
// numbers). NEVER store API keys, license keys, or any other secret here —
// the file lives unencrypted in the user profile.

export function resolveStateDir(): string {
  const override = process.env["FENEK_STATE_DIR"]
  if (override !== undefined && override !== "") return override
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "fenek-portfolio-companion")
  }
  if (process.platform === "win32") {
    const appData = process.env["APPDATA"]
    return join(appData ?? join(homedir(), "AppData", "Roaming"), "fenek-portfolio-companion")
  }
  const xdg = process.env["XDG_STATE_HOME"]
  return join(xdg ?? join(homedir(), ".local", "state"), "fenek-portfolio-companion")
}

export function readStateFile<T>(fileName: string, schema: z.ZodType<T>): T | undefined {
  try {
    const raw = readFileSync(join(resolveStateDir(), fileName), "utf8")
    const parsed = schema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

export function writeStateFile(fileName: string, data: Record<string, unknown>): void {
  try {
    const dir = resolveStateDir()
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, fileName), JSON.stringify(data, null, 2))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`fenek: failed to persist app state '${fileName}': ${message}`)
  }
}
