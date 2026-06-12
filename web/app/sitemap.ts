import type { MetadataRoute } from "next"
import { LANGS, localizedPath } from "@/lib/i18n"
import { SITE_URL } from "@/lib/site"

export const dynamic = "force-static"

const PATHS = ["/", "/security", "/install", "/privacy", "/changelog"]

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
