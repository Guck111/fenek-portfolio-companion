// Buttondown newsletter configuration.
//
// TODO(arseni): replace the placeholder with the real Buttondown username once
// the account exists (roadmap Task 0.2). Until then the embed form posts to a
// list that does not resolve — harmless, but no one is subscribed.
export const BUTTONDOWN_USERNAME = "fenek-PLACEHOLDER"

export const BUTTONDOWN_CONFIGURED = !BUTTONDOWN_USERNAME.includes("PLACEHOLDER")

// Surface a loud warning at build time (server only) so a deploy with the
// placeholder still standing is impossible to miss in CI logs.
if (!BUTTONDOWN_CONFIGURED && typeof window === "undefined") {
	console.warn(
		"[fenek-web] BUTTONDOWN_USERNAME is still a placeholder — set the real Buttondown username in web/lib/config.ts before deploying.",
	)
}
