// Canonical, build-time constants for the Fenek site.
// External hosts the built site references: github.com, fenek.tech,
// buttondown.com (newsletter form), and polar.sh (Pro checkout + customer
// portal). The Polar links are user-click <a href>s, not automatic requests —
// the only automatic outbound call the site makes is the Buttondown form.

export const SITE_URL = "https://fenek.tech"

export const GITHUB_URL = "https://github.com/Guck111/fenek-portfolio-companion"
export const SUPPORT_EMAIL = "support@fenek.tech"
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`
export const GITHUB_LICENSE_URL = `${GITHUB_URL}/blob/master/LICENSE`
export const GITHUB_SECURITY_URL = `${GITHUB_URL}/blob/master/SECURITY.md`
export const BUILDING_PRO_URL = `${GITHUB_URL}/blob/master/docs/building-pro.md`

// Points at whatever release is currently flagged "Latest" on GitHub (v0.4.1+).
// The release *page* — used by the install steps as a human-readable pointer.
export const RELEASES_LATEST_URL = `${GITHUB_URL}/releases/latest`

// Direct download of the .mcpb asset attached to the current "Latest" release.
// GitHub 302-redirects this to the asset (served Content-Disposition: attachment),
// so a click downloads the file straight away — no intermediate release page.
export const MCPB_DOWNLOAD_URL = `${GITHUB_URL}/releases/latest/download/fenek-portfolio-companion.mcpb`

// Polar (merchant of record). Pro checkout link — Polar redirects to /success
// on payment and to /checkout-cancelled from its "back" button.
export const POLAR_CHECKOUT_URL =
	"https://buy.polar.sh/polar_cl_oZaCzPqSSJMApjqwp9u3HaEycnWN8yuyf1YhR06CzYu"

// Customer portal, where a subscriber manages or cancels their subscription.
// org-slug confirmed against Polar dashboard → Settings → Organization Slug.
export const POLAR_PORTAL_URL = "https://polar.sh/fenek/portal"
