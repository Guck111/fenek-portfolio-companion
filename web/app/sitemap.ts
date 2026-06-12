import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

export const dynamic = "force-static"

const PATHS = ["/", "/security/", "/install/", "/privacy/", "/changelog/"]

const sitemap = (): MetadataRoute.Sitemap =>
	PATHS.map((path) => ({
		url: `${SITE_URL}${path}`,
		changeFrequency: "monthly",
		priority: path === "/" ? 1 : 0.7,
	}))

export default sitemap
