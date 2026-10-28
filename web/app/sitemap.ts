import type { MetadataRoute } from "next"
import { LANGS, localizedPath } from "@/lib/i18n"
import { PAID_PLANS_ENABLED, SITE_URL } from "@/lib/site"

export const dynamic = "force-static"

// Routes that exist only while paid plans are on; otherwise they redirect.
const PAID_PATHS = new Set(["/pricing", "/refund"])

const PATHS = [
	"/",
	"/security",
	"/pricing",
	"/install",
	"/privacy",
	"/terms",
	"/refund",
	"/changelog",
].filter((path) => PAID_PLANS_ENABLED || !PAID_PATHS.has(path))

const sitemap = (): MetadataRoute.Sitemap =>
	LANGS.flatMap((lang) =>
		PATHS.map((path) => ({
			url: `${SITE_URL}${localizedPath(lang, path)}`,
			changeFrequency: "monthly" as const,
			priority: path === "/" ? 1 : 0.7,
			alternates: {
				languages: Object.fromEntries(
					LANGS.map((entry) => [entry, `${SITE_URL}${localizedPath(entry, path)}`]),
				),
			},
		})),
	)

export default sitemap
