import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { SiteFooter } from "@/components/fenek/SiteFooter"
import { SiteHeader } from "@/components/fenek/SiteHeader"
import "./globals.css"

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
			<body>
				<a className="skip" href="#app">
					Skip to content
				</a>
				<SiteHeader />
				<main id="app">{children}</main>
				<SiteFooter />
			</body>
		</html>
	)
}

export default RootLayout
