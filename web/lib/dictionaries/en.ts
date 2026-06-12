import { BUILDING_PRO_URL, GITHUB_URL, RELEASES_LATEST_URL } from "@/lib/site"

// English is the source dictionary: it defines the Dictionary type that every
// other locale must satisfy. Strings may use inline markdown (**bold**, `code`,
// [text](url)) rendered by RichText; internal links ("/security") are localized.
const en = {
	nav: {
		security: "Security",
		install: "Install",
		changelog: "Changelog",
		github: "GitHub",
		menu: "Menu",
		primary: "Primary",
		chooseLanguage: "Choose language",
	},
	common: {
		skip: "Skip to content",
		download: "Download for Claude Desktop",
		viewSource: "View source on GitHub",
		emailPlaceholder: "you@example.com",
		emailLabel: "Email address",
		getReleaseNotes: "Get release notes",
	},
	footer: {
		tagline:
			"A read-only portfolio companion for Claude Desktop. It runs on your machine and reads your data — it never moves a thing.",
		colProduct: "Product",
		colLegal: "Legal",
		colSource: "Source",
		home: "Home",
		security: "Security",
		install: "Install",
		changelog: "Changelog",
		privacy: "Privacy",
		github: "GitHub",
		license: "License (MIT)",
		support: "Support",
		disc1:
			"Fenek Portfolio Companion is open source (MIT). Not affiliated with any broker or exchange.",
		disc2: "Not investment advice — Fenek only reads and organizes your own data.",
		meta1: "Read-only · Zero telemetry",
		meta2: "Runs locally in Claude Desktop",
	},
	home: {
		meta: {
			title: "Fenek Portfolio Companion — ask Claude about your portfolio",
			description:
				"A read-only companion for Claude Desktop. It reads your whole portfolio — Trading 212, Bybit, and crypto wallets — and never moves a thing. Runs locally, zero telemetry.",
		},
		hero: {
			eyebrow: "Read-only MCP server · for Claude Desktop",
			h1: "Ask Claude about your portfolio",
			lede: "Read-only. Runs on your machine. Your keys never leave your computer.",
			demoLabel: "Claude Desktop · Fenek",
			demoCaption: "Live demo coming soon",
		},
		trust: [
			"Read-only by design",
			"Keys in your OS keychain",
			"Zero telemetry",
			"Open source (MIT)",
		],
		how: {
			h2: "How it works",
			lede: "Three steps, no backend. Everything runs locally inside Claude Desktop.",
			steps: [
				{
					title: "Download & install",
					body: "Download and double-click — Claude Desktop installs it.",
				},
				{ title: "Paste your keys", body: "Paste read-only API keys from your broker." },
				{
					title: "Ask anything",
					body: "Ask Claude anything about your positions, dividends, risk.",
				},
			],
		},
		sources: {
			h2: "Supported sources",
			lede: "Fill in only the sources you use — every credential field is optional.",
			items: [
				{
					name: "Trading 212",
					type: "Broker",
					extra: "Positions, pies, dividends, transactions, and order history.",
				},
				{
					name: "Bybit",
					type: "Exchange",
					extra:
						"Spot balances, derivatives positions, and Earn — leverage, liquidation price, APY.",
				},
				{
					name: "Crypto wallets",
					type: "On-chain · by public address",
					extra: "Solana, TON, Bitcoin, Litecoin, Dogecoin — keyless, read from public explorers.",
				},
			],
			voteKicker: "Vote for the next source",
			voteButton: "Vote & subscribe",
			voteFieldLabel: "Which source do you want next?",
			voteFieldPlaceholder: "e.g. IBKR, Kraken, an Ethereum wallet…",
		},
		pricing: {
			badge: "Free today",
			h2: "Free today. The core stays free forever.",
			body: "Everything you can download today is free. Crypto features (Bybit, crypto wallets) will become part of Pro — under $5/mo. Classic brokers like Trading 212 stay free forever. Early newsletter subscribers get a launch discount. Everything stays open source.",
			aside: `Prefer full anonymity? [Build the Pro features from source](${BUILDING_PRO_URL}) for free — no license, no checkout.`,
			note: "Release notes and the Pro launch, nothing else.",
			button: "Get the launch discount",
		},
		install: {
			eyebrow: "Install",
			h2: "Get Fenek for Claude Desktop",
			lede: "One file, double-click to install. No account, no backend.",
			guide: "Installation guide →",
		},
	},
	security: {
		meta: {
			title: "Security",
			description:
				"Every request Fenek makes over the network, how to verify each one in the source, how your keys are stored, and how to check release provenance.",
		},
		intro: {
			eyebrow: "Security",
			h1: "What leaves your computer",
			sub: "Fenek is a local, read-only tool. Here is every request it makes over the network, how to verify each one against the source, and how your keys are kept.",
		},
		flow: {
			kicker: "What leaves your computer",
			head: "Fenek talks to your brokers — and to no one else.",
			machineName: "Your machine",
			machineSub: "Claude Desktop + Fenek",
			lock: "HTTPS",
			brokerName: "Your broker",
			brokerSub: "Official read-only API",
			authorName: "The developer",
			authorSub: "No server. No analytics.",
			sever:
				"Fenek has no backend. Nothing routes through the author, so there is nowhere else for your data to go.",
			foot: ["Read-only requests", "Keys stay in your OS keychain", "Zero telemetry"],
		},
		outbound: {
			h2: "Three kinds of outbound requests",
			lead: "Exactly three kinds of outbound requests leave your machine, and you can verify each one in the source code:",
			items: [
				"**Calls to your brokers’ official APIs** (Trading 212, Bybit, public blockchain explorers) — that’s the product.",
				"**A weekly anonymous version check** against `api.github.com`. Only the version number is read from the response. Turn it off with the “Check for updates” toggle in extension settings.",
				"**Nothing else.** No analytics, no error reporting, no telemetry. This website has no analytics or cookies either.",
			],
		},
		verify: {
			h2: "Verify it yourself",
			p1: "Don’t take our word for it. Clone the repository and list every outbound call:",
			cmd: '# every outbound network call in the codebase\ngrep -rn "fetch(" src/',
			p2: `Every request goes through the broker clients named above — there is no other network code. Read all of it on [GitHub](${GITHUB_URL}).`,
		},
		keys: {
			h2: "Your keys",
			p1: "Claude Desktop stores your API keys in your operating system’s keychain (macOS Keychain / Windows Credential Manager) — the fields are marked sensitive. Fenek never logs them, never prints them, and never puts them in an error message.",
			p2: "When you create a key at your broker, enable read permissions only:",
			items: [
				"**Trading 212** — account, portfolio, and history. No Orders.",
				"**Bybit** — the read groups only (Unified Trading, Assets/Wallet, Earn). No Trade, no Withdraw, no Transfer.",
				"**Crypto wallets** — paste public addresses only. They are read keyless; no key or secret is ever involved.",
			],
		},
		provenance: {
			h2: "Release provenance",
			p1: "Every `.mcpb` is built in GitHub Actions with a build-provenance attestation, so you can confirm the file you downloaded was produced by the public CI from this source — not swapped or tampered with. Verify it before installing:",
			cmd: "# checks the download against its signed build provenance\ngh attestation verify fenek-portfolio-companion.mcpb \\\n  --repo Guck111/fenek-portfolio-companion",
			p2: "A genuine download prints `✓ Verification succeeded!`. Anything else means the file did not come from this repository’s CI — don’t install it.",
		},
	},
	privacy: {
		meta: {
			title: "Privacy",
			description:
				"Fenek collects nothing. The extension runs locally, this website has no analytics or cookies, and the newsletter is the only place an email is ever stored.",
		},
		intro: {
			eyebrow: "Privacy",
			h1: "Privacy policy",
			sub: "The short version: Fenek collects nothing. Here is the long version.",
		},
		sections: [
			{
				h2: "The extension",
				body: "Fenek Portfolio Companion does not collect, store, or transmit your personal data. The extension runs locally and talks only to the APIs listed on the [Security page](/security). We run no servers and receive nothing.",
			},
			{
				h2: "This website",
				body: "This website sets no cookies and runs no analytics or third-party scripts.",
			},
			{
				h2: "Newsletter",
				body: "If you subscribe, your email is stored by Buttondown (our newsletter provider) and used only to send release notes and product updates. Unsubscribe anytime; see [Buttondown’s privacy policy](https://buttondown.com/legal/privacy).",
			},
			{
				h2: "Future Pro subscriptions",
				body: "Future Pro subscriptions will be processed by a merchant of record; payment data never reaches us. The extension’s license check sends only the license key.",
			},
		],
	},
	install: {
		meta: {
			title: "Install",
			description:
				"Install Fenek for Claude Desktop: download the .mcpb, double-click to install, paste your read-only keys, and ask Claude about your portfolio.",
		},
		hero: {
			eyebrow: "Install",
			h1: "Install Fenek",
			lede: "One file, double-click to install. No account, no backend — about two minutes.",
			demoLabel: "Installing Fenek",
			demoCaption: "Install walkthrough coming soon",
		},
		steps: {
			h2: "Step by step",
			items: [
				`**Download the .mcpb** from the [latest GitHub release](${RELEASES_LATEST_URL}).`,
				"**Double-click the file.** Claude Desktop opens and asks to install.",
				"**Open Settings → Extensions → Fenek** and paste your read-only keys.",
				"**Start a chat** and run `fenek_getting_started`.",
			],
		},
		updates: {
			h2: "Updates",
			body: "Manual installs don’t auto-update. Subscribe to release notes below — and Fenek itself will remind you in chat when a new version is out.",
			button: "Get release notes",
		},
	},
	changelog: {
		meta: {
			title: "Changelog",
			description:
				"Every released version of Fenek Portfolio Companion, straight from the repository.",
		},
		intro: {
			eyebrow: "Changelog",
			h1: "Changelog",
			sub: "Every released version of Fenek. Don’t want to check this page? Get release notes by email.",
		},
		button: "Get release notes",
	},
}

export type Dictionary = typeof en
export { en }
