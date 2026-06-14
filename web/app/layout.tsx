import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import "./globals.css"

// Base metadata only. Per-page title/description, canonical, hreflang and Open
// Graph come from buildMetadata() in each route. Page chrome (header/footer)
// lives in SiteShell so it can be locale-aware.
export const metadata: Metadata = {
	metadataBase: new URL("https://fenek.tech"),
	title: {
		default: "Fenek Portfolio Companion — ask Claude about your portfolio",
		template: "%s — Fenek",
	},
	description:
		"A read-only companion for Claude Desktop. It reads your whole portfolio — Trading 212, Bybit, and crypto wallets — and never moves a thing. Runs locally, zero telemetry.",
	applicationName: "Fenek",
	robots: { index: true, follow: true },
}

export const viewport: Viewport = {
	themeColor: "#1E5A4B",
}

const RootLayout = ({ children }: { children: ReactNode }) => {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	)
}

export default RootLayout
