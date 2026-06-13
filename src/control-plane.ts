import { warmLicenseCheck } from "./license/manager.js"

// Control-plane seam.
//
// The ONLY place where the license check enters the process. With the paywall
// armed (PAYWALL_ENABLED in src/license/config.ts), warmLicenseCheck() makes at
// most one license request per ~30 days for a Pro subscriber, and stays a no-op
// with ZERO outbound network calls for free users and freepro builds. It is
// invoked AFTER the server starts (fire and forget), so it can never delay or
// block the MCP initialize handshake.
export async function controlPlaneCheck(): Promise<void> {
  await warmLicenseCheck()
}
