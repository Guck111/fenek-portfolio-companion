import { warmLicenseCheck } from "./license/manager.js"

// Control-plane seam.
//
// The ONLY place where the license check enters the process. While
// PAYWALL_ENABLED (src/license/config.ts) is false — i.e. until a purchase
// channel exists — warmLicenseCheck() returns immediately and this remains
// a no-op with ZERO outbound network calls, preserving the zero-telemetry
// guarantee in PRIVACY.md: the only hosts this process contacts are the
// user's broker APIs. It is invoked AFTER the server starts (fire and
// forget), so it can never delay or block the MCP initialize handshake.
export async function controlPlaneCheck(): Promise<void> {
  await warmLicenseCheck()
}
