import Link from "next/link"
import { DemoFrame } from "@/components/fenek/DemoFrame"
import { TrustStrip } from "@/components/fenek/TrustStrip"
import { DownloadButton } from "@/components/ui/DownloadButton"
import { DownloadIcon, GitHubIcon } from "@/components/ui/icons"
import { NewsletterForm } from "@/components/ui/NewsletterForm"
import { BUILDING_PRO_URL, GITHUB_URL } from "@/lib/site"

const STEPS = [
	{ title: "Download & install", body: "Download and double-click — Claude Desktop installs it." },
	{ title: "Paste your keys", body: "Paste read-only API keys from your broker." },
	{ title: "Ask anything", body: "Ask Claude anything about your positions, dividends, risk." },
]

const SOURCES = [
	{
		name: "Trading 212",
		type: "Broker",
		extra: "Positions, pies, dividends, transactions, and order history.",
	},
	{
		name: "Bybit",
		type: "Exchange",
		extra: "Spot balances, derivatives positions, and Earn — leverage, liquidation price, APY.",
	},
	{
		name: "Crypto wallets",
		type: "On-chain · by public address",
		extra: "Solana, TON, Bitcoin, Litecoin, Dogecoin — keyless, read from public explorers.",
	},
]

const HomePage = () => {
	return (
		<>
			<section className="hero" aria-labelledby="hero-h">
				<div className="wrap">
					<div className="hero-grid">
						<div className="hero-text">
							<p className="eyebrow">Read-only MCP server · for Claude Desktop</p>
							<h1 id="hero-h" className="hero-name">
								Ask Claude about your portfolio
							</h1>
							<p className="lede">
								Read-only. Runs on your machine. Your keys never leave your computer.
							</p>
							<div className="cta-row">
								<a className="btn btn-pri" href="#install">
									<DownloadIcon />
									<span>Download for Claude Desktop</span>
								</a>
								<a
									className="btn btn-sec"
									href={GITHUB_URL}
									target="_blank"
									rel="noopener noreferrer"
								>
									<GitHubIcon />
									<span>View source on GitHub</span>
								</a>
							</div>
						</div>
						<div className="hero-art">
							<DemoFrame />
						</div>
					</div>
				</div>
			</section>

			<TrustStrip />

			<section aria-labelledby="how-h">
				<div className="wrap">
					<div className="section-head">
						<h2 id="how-h">How it works</h2>
						<p>Three steps, no backend. Everything runs locally inside Claude Desktop.</p>
					</div>
					<div className="steps">
						{STEPS.map((step, i) => (
							<div className="step" key={step.title}>
								<div className="num">{`0${i + 1}`}</div>
								<h3>{step.title}</h3>
								<p>{step.body}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			<section className="alt" aria-labelledby="src-h">
				<div className="wrap">
					<div className="section-head">
						<h2 id="src-h">Supported sources</h2>
						<p>Fill in only the sources you use — every credential field is optional.</p>
					</div>
					<div className="source-grid">
						{SOURCES.map((source) => (
							<div className="source" key={source.name}>
								<div className="nm">{source.name}</div>
								<div className="ty">{source.type}</div>
								<div className="extra">{source.extra}</div>
							</div>
						))}
					</div>
					<div className="vote-row">
						<p className="kicker">Vote for the next broker</p>
						<NewsletterForm tag="next-broker" buttonLabel="Vote & subscribe" />
					</div>
				</div>
			</section>

			<section aria-labelledby="pricing-h">
				<div className="wrap">
					<div className="callout">
						<span className="free-badge">
							<span className="tick" />
							Free today
						</span>
						<h2 id="pricing-h">Free today. The core stays free forever.</h2>
						<p>
							Everything you can download today is free. Crypto features (Bybit, crypto wallets)
							will become part of Pro — under $5/mo. Classic brokers like Trading 212 stay free
							forever. Early newsletter subscribers get a launch discount. Everything stays open
							source.
						</p>
						<p className="callout-aside">
							{"Prefer full anonymity? "}
							<a href={BUILDING_PRO_URL} target="_blank" rel="noopener noreferrer">
								Build the Pro features from source
							</a>
							{" for free — no license, no checkout."}
						</p>
						<NewsletterForm tag="pro-waitlist" buttonLabel="Get the launch discount" />
						<p className="newsletter-note">Release notes and the Pro launch, nothing else.</p>
					</div>
				</div>
			</section>

			<section className="alt" id="install" aria-labelledby="install-h">
				<div className="wrap">
					<div className="cta-center">
						<p className="eyebrow">Install</p>
						<h2 id="install-h">Get Fenek for Claude Desktop</h2>
						<p className="section-lead">
							One file, double-click to install. No account, no backend.
						</p>
						<div className="cta-row">
							<DownloadButton />
						</div>
						<Link className="install-guide" href="/install">
							Installation guide →
						</Link>
					</div>
				</div>
			</section>
		</>
	)
}

export default HomePage
