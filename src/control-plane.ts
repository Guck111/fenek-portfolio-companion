// Control-plane seam (inert).
//
// This is the single place where a FUTURE license/version check will live if
// the project ever monetizes (see the go-to-market spec, "data plane vs control
// plane"). While the project is FREE, this function MUST stay a no-op and make
// ZERO outbound network calls. The zero-telemetry guarantee in PRIVACY.md and
// CLAUDE.md depends on it: the only host this process may contact is the user's
// broker API. Do not add fetch()/http here without an explicit decision to
// monetize and a corresponding update to PRIVACY.md, README.md and CLAUDE.md.
// eslint-disable-next-line @typescript-eslint/require-await -- no-op seam; will await once the license check lands
export async function controlPlaneCheck(): Promise<void> {
  // Intentionally empty. No network. No I/O.
  return undefined
}
