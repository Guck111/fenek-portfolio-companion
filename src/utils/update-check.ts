import { z } from "zod"

import { readStateFile, writeStateFile } from "./app-state.js"
import { isNewerVersion } from "./semver.js"

// Two-tier "you might be on an old build" nudge. Tier 1 (network, opt-out):
// once a week ask GitHub for the latest release tag. Tier 0 (no network,
// always on): if the build is older than ~60 days, suggest checking the site.
// Only the version number ever leaves the machine, and only the latest tag is
// read from the response. Hosts are hardcoded constants, never from the network.

const STATE_FILE = "update-state.json"
const CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000
const REMIND_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000
const AGE_NOTICE_MS = 60 * 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 4000

const RELEASES_URL =
  "https://api.github.com/repos/Guck111/fenek-portfolio-companion/releases/latest"
const INSTALL_URL = "https://fenek.tech/install"
const CHANGELOG_URL = "https://fenek.tech/changelog"

export const UpdateStateSchema = z.object({
  lastUpdateCheckAt: z.string().optional(),
  latestKnownVersion: z.string().optional(),
  lastRemindedAt: z.string().optional(),
})
export type UpdateState = z.infer<typeof UpdateStateSchema>

export function readUpdateState(): UpdateState {
  return readStateFile(STATE_FILE, UpdateStateSchema) ?? {}
}

// Once-per-process latch so a chatty session isn't peppered with the notice.
let remindedThisProcess = false
export function _resetForTests(): void {
  remindedThisProcess = false
}

// Cheap check so callers can skip a state-file read once the notice has fired.
export function isReminderLatched(): boolean {
  return remindedThisProcess
}

const GithubRelease = z.object({ tag_name: z.string() })

// True when `intervalMs` has elapsed since `iso`. A missing, corrupt
// (unparseable → NaN), or future (clock-skew → negative) stamp counts as
// elapsed, so a bad timestamp fails toward "do the thing" rather than getting
// stuck — and self-heals on the next valid write.
function intervalElapsed(iso: string | undefined, intervalMs: number): boolean {
  if (iso === undefined) return true
  const elapsed = Date.now() - Date.parse(iso)
  return !Number.isFinite(elapsed) || elapsed < 0 || elapsed >= intervalMs
}

export async function runUpdateCheckIfDue(opts: {
  checkUpdates: boolean
  state: UpdateState
}): Promise<void> {
  const { checkUpdates, state } = opts
  if (!checkUpdates) return
  if (!intervalElapsed(state.lastUpdateCheckAt, CHECK_INTERVAL_MS)) return

  const stampedAt = new Date().toISOString()
  try {
    const res = await fetch(RELEASES_URL, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "fenek-portfolio-companion",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    // Re-read fresh state right before writing so a concurrent getUpdateNotice
    // write (lastRemindedAt) during the fetch window is not clobbered.
    const next: UpdateState = { ...readUpdateState(), lastUpdateCheckAt: stampedAt }
    if (res.ok) {
      const parsed = GithubRelease.safeParse(await res.json())
      // Only keep a tag that survives strict X.Y.Z parsing — a pre-release,
      // "nightly", or overflowing tag is dropped rather than risk a bad nudge.
      if (parsed.success && isNewerVersion(parsed.data.tag_name, "0.0.0")) {
        next.latestKnownVersion = parsed.data.tag_name.trim().replace(/^v/, "")
      }
    }
    writeStateFile(STATE_FILE, next)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`fenek: update check failed: ${message}`)
    // Stamp the time anyway so a stable failure doesn't hammer the network.
    writeStateFile(STATE_FILE, { ...readUpdateState(), lastUpdateCheckAt: stampedAt })
  }
}

export function getUpdateNotice(
  state: UpdateState,
  build: { buildVersion: string; buildDate: string },
): string | null {
  if (remindedThisProcess) return null
  if (!intervalElapsed(state.lastRemindedAt, REMIND_INTERVAL_MS)) return null

  let notice: string | null = null
  const latest = state.latestKnownVersion
  if (latest !== undefined && isNewerVersion(latest, build.buildVersion)) {
    notice = `Update available: v${latest} (installed v${build.buildVersion}). Download: ${INSTALL_URL}`
  } else if (latest === undefined && Date.now() - Date.parse(build.buildDate) > AGE_NOTICE_MS) {
    // Age fallback only when we have NO version info (offline / check disabled).
    // If the latest is known and not newer, the user is current — stay silent.
    notice = `This Fenek build is over two months old. Check ${CHANGELOG_URL} for updates.`
  }

  if (notice !== null) {
    remindedThisProcess = true
    writeStateFile(STATE_FILE, { ...state, lastRemindedAt: new Date().toISOString() })
  }
  return notice
}
