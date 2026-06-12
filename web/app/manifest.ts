import type { MetadataRoute } from "next"

export const dynamic = "force-static"

const manifest = (): MetadataRoute.Manifest => ({
	name: "Fenek",
	short_name: "Fenek",
	description:
		"A read-only portfolio companion for Claude Desktop. Reads your whole portfolio and never moves a thing.",
	start_url: "/",
	display: "standalone",
	background_color: "#F4F1E9",
	theme_color: "#1E5A4B",
	icons: [
		{ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
		{ src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
	],
})

export default manifest
