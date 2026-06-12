import type { Metadata } from "next"
import type { Dictionary } from "@/lib/dictionaries"
import { type Lang, localizedPath } from "@/lib/i18n"

type PageKey = "home" | "security" | "privacy" | "install" | "changelog"

const PAGE_PATH: Record<PageKey, string> = {
	home: "/",
	security: "/security",
	privacy: "/privacy",
	install: "/install",
	changelog: "/changelog",
}

// Per-page, per-locale metadata: localized title/description, a self-canonical,
// hreflang alternates for both locales, and matching Open Graph / Twitter cards.
export const buildMetadata = (page: PageKey, lang: Lang, dict: Dictionary): Metadata => {
	const path = PAGE_PATH[page]
	const meta = dict[page].meta
	const canonical = localizedPath(lang, path)
	const enHref = localizedPath("en", path)
	const ruHref = localizedPath("ru", path)
	return {
		title: page === "home" ? { absolute: meta.title } : meta.title,
		description: meta.description,
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
		},
		twitter: { card: "summary", title: meta.title, description: meta.description },
	}
}
