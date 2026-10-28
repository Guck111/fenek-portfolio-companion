import type { ReactNode } from "react"
import { type Lang, localizedPath } from "@/lib/i18n"
import { PAID_PLANS_ENABLED } from "@/lib/site"

// Keep redirecting stubs out of search results while paid plans are off.
export const paidRouteNoindex = !PAID_PLANS_ENABLED

// Pricing, checkout and refund routes only make sense while paid plans are on.
// With PAID_PLANS_ENABLED = false they send visitors (and old external links)
// to the install page instead. The site is a static export with no server, so
// the redirect is a meta refresh (React hoists it into <head>) plus a plain
// link as a fallback. The wrapped page views stay untouched.
export const PaidRouteGate = ({ lang, children }: { lang: Lang; children: ReactNode }) => {
	if (PAID_PLANS_ENABLED) return children
	const target = localizedPath(lang, "/install")
	return (
		<>
			<meta httpEquiv="refresh" content={`0; url=${target}`} />
			<p>
				<a href={target}>{target}</a>
			</p>
		</>
	)
}
