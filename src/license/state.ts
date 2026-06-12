import { createHash } from "node:crypto"

import { z } from "zod"

import { readStateFile, writeStateFile } from "../utils/app-state.js"

const FILE_NAME = "license-state.json"

// Cached verdict bookkeeping only. The raw license key NEVER goes into this
// file — just a short fingerprint so that changing the key in the extension
// settings invalidates the cache.
const LicenseStateSchema = z.object({
  keyFingerprint: z.string(),
  lastVerdict: z.enum(["valid", "revoked"]),
  checkedAt: z.iso.datetime(),
  validUntil: z.iso.datetime().optional(),
})

export type LicenseState = z.infer<typeof LicenseStateSchema>

export function keyFingerprint(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16)
}

export function readLicenseState(): LicenseState | undefined {
  return readStateFile(FILE_NAME, LicenseStateSchema)
}

export function writeLicenseState(state: LicenseState): void {
  writeStateFile(FILE_NAME, state)
}
