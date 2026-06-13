import type { Metadata } from "next"
import type { Dictionary } from "@/lib/dictionaries"
import { type Lang, localizedPath } from "@/lib/i18n"

type PageKey =
	| "home"
	| "security"
	| "privacy"
	| "install"
	| "changelog"
	| "success"
	| "checkoutCancelled"

const PAGE_PATH: Record<PageKey, string> = {
	home: "/",
	security: "/security",
	privacy: "/privacy",
	install: "/install",
	changelog: "/changelog",
	success: "/success",
	checkoutCancelled: "/checkout-cancelled",
}

// Per-page, per-locale metadata: localized title/description, a self-canonical,
// hreflang alternates for both locales, and matching Open Graph / Twitter cards.
// Pass noindex for transactional pages (checkout success/cancel) that must stay
// out of search and the sitemap.
export const buildMetadata = (
	page: PageKey,
	lang: Lang,
	dict: Dictionary,
	noindex = false,
): Metadata => {
	const path = PAGE_PATH[page]
	const meta = dict[page].meta
	const canonical = localizedPath(lang, path)
	const enHref = localizedPath("en", path)
	const ruHref = localizedPath("ru", path)
	return {
		title: page === "home" ? { absolute: meta.title } : meta.title,
		description: meta.description,
		...(noindex ? { robots: { index: false, follow: true } } : {}),
		alternates: {
			canonical,
			languages: { en: enHref, ru: ruHref, "x-default": enHref },
		},
		openGraph: {
			type: "website",
			siteName: "Fenek",
			title: meta.title,
			description: meta.description,
			url: canonical,
			locale: lang === "ru" ? "ru_RU" : "en_US",
			images: [{ url: "/og-image.png", width: 1200, height: 630 }],
		},
		twitter: {
			card: "summary_large_image",
			title: meta.title,
			description: meta.description,
			images: ["/og-image.png"],
		},
	}
}
