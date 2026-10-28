import { warmLicenseCheck } from "./license/manager.js"

// Control-plane seam.
//
// The ONLY place where the license check enters the process. The paywall is
// currently disarmed (PAYWALL_ENABLED = false in src/license/config.ts), so
// warmLicenseCheck() is a no-op with ZERO outbound network calls. If the
// paywall is ever re-armed, it makes at most one license request per ~30 days
// for a Pro subscriber. It is invoked AFTER the server starts (fire and
// forget), so it can never delay or block the MCP initialize handshake.
export async function controlPlaneCheck(): Promise<void> {
  await warmLicenseCheck()
}
