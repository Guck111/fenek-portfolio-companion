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
		"Read-only aggregator of your portfolio data across EU-available wallets, exchanges and brokers (Trading 212, Bybit incl. derivatives & Earn, Bitcoin/Litecoin/Dogecoin/Solana/TON wallets). Data collection only — no recommendations.",
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
