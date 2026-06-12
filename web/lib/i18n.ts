export const LANGS = ["en", "ru"] as const
export type Lang = (typeof LANGS)[number]
export const DEFAULT_LANG: Lang = "en"

export const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value)

export const LANG_LABELS: Record<Lang, { name: string; code: string }> = {
	en: { name: "English", code: "EN" },
	ru: { name: "Русский", code: "RU" },
}

// English lives at the site root; every other locale is path-prefixed (/ru/...).
export const localizedHref = (lang: Lang, path: string): string => {
	if (lang === DEFAULT_LANG) return path
	return path === "/" ? `/${lang}` : `/${lang}${path}`
}

// Strip a locale prefix from a pathname, returning the canonical (English) path.
export const stripLocale = (pathname: string): string => {
	for (const lang of LANGS) {
		if (lang === DEFAULT_LANG) continue
		if (pathname === `/${lang}` || pathname === `/${lang}/`) return "/"
		if (pathname.startsWith(`/${lang}/`)) return pathname.slice(`/${lang}`.length)
	}
	return pathname
}

// The equivalent of the current path in another locale (for the switcher).
export const swapLocalePath = (pathname: string, target: Lang): string =>
	localizedHref(target, stripLocale(pathname))

// Trailing-slash form for canonical URLs and the sitemap (the export uses
// trailingSlash: true, so /security/ is the file that actually exists).
export const localizedPath = (lang: Lang, path: string): string => {
	const href = localizedHref(lang, path)
	return href.endsWith("/") ? href : `${href}/`
}
