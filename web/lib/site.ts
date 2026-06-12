// Canonical, build-time constants for the Fenek site.
// The only external hosts the built site ever references are github.com and
// fenek.tech (plus buttondown.com from the newsletter form). Keep it that way.

export const SITE_URL = "https://fenek.tech"

export const GITHUB_URL = "https://github.com/Guck111/fenek-portfolio-companion"
export const GITHUB_ISSUES_URL = `${GITHUB_URL}/issues`
export const GITHUB_LICENSE_URL = `${GITHUB_URL}/blob/master/LICENSE`
export const GITHUB_SECURITY_URL = `${GITHUB_URL}/blob/master/SECURITY.md`

// Points at whatever release is currently flagged "Latest" on GitHub (v0.4.1+).
export const RELEASES_LATEST_URL = `${GITHUB_URL}/releases/latest`
