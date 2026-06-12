import type { Metadata } from "next"
import { DataFlow } from "@/components/fenek/DataFlow"
import { CodeBlock } from "@/components/ui/CodeBlock"
import { GITHUB_URL } from "@/lib/site"

export const metadata: Metadata = {
	title: "Security",
	description:
		"Every request Fenek makes over the network, how to verify each one in the source, how your keys are stored, and how to check release provenance.",
}

const SecurityPage = () => (
	<>
		<section className="page-intro">
			<div className="wrap">
				<p className="eyebrow">Security</p>
				<h1>What leaves your computer</h1>
				<p className="page-sub">
					Fenek is a local, read-only tool. Here is every request it makes over the network, how to
					verify each one against the source, and how your keys are kept.
				</p>
			</div>
		</section>

		<section className="trust">
			<div className="wrap">
				<DataFlow />
			</div>
		</section>

		<section className="content-section" aria-labelledby="outbound-h">
			<div className="wrap">
				<div className="section-head">
					<h2 id="outbound-h">Three kinds of outbound requests</h2>
				</div>
				<div className="prose">
					<p>
						Exactly three kinds of outbound requests leave your machine, and you can verify each one
						in the source code:
					</p>
					<ol className="numbered">
						<li>
							<span>
								<strong>Calls to your brokers’ official APIs</strong>
								{" (Trading 212, Bybit, public blockchain explorers) — that’s the product."}
							</span>
						</li>
						<li>
							<span>
								<strong>A weekly anonymous version check</strong>
								{" against "}
								<code>api.github.com</code>
								{
									". Only the version number is read from the response. Turn it off with the “Check for updates” toggle in extension settings."
								}
							</span>
						</li>
						<li>
							<span>
								<strong>Nothing else.</strong>
								{
									" No analytics, no error reporting, no telemetry. This website has no analytics or cookies either."
								}
							</span>
						</li>
					</ol>
					{/*
					Pro release — uncomment once the paid tier ships:
					<p>Pro subscribers only: a monthly license check that sends your license key and nothing else.</p>
					*/}
				</div>
			</div>
		</section>

		<section className="content-section alt" aria-labelledby="verify-h">
			<div className="wrap">
				<div className="section-head">
					<h2 id="verify-h">Verify it yourself</h2>
				</div>
				<div className="prose">
					<p>Don’t take our word for it. Clone the repository and list every outbound call:</p>
					<CodeBlock>
						{'# every outbound network call in the codebase\ngrep -rn "fetch(" src/'}
					</CodeBlock>
					<p>
						{
							"Every request goes through the broker clients named above — there is no other network code. Read all of it on "
						}
						<a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
							GitHub
						</a>
						.
					</p>
				</div>
			</div>
		</section>

		<section className="content-section" aria-labelledby="keys-h">
			<div className="wrap">
				<div className="section-head">
					<h2 id="keys-h">Your keys</h2>
				</div>
				<div className="prose">
					<p>
						Claude Desktop stores your API keys in your operating system’s keychain (macOS Keychain
						/ Windows Credential Manager) — the fields are marked sensitive. Fenek never logs them,
						never prints them, and never puts them in an error message.
					</p>
					<p>When you create a key at your broker, enable read permissions only:</p>
					<ul>
						<li>
							<strong>Trading 212</strong>
							{" — account, portfolio, and history. No Orders."}
						</li>
						<li>
							<strong>Bybit</strong>
							{
								" — the read groups only (Unified Trading, Assets/Wallet, Earn). No Trade, no Withdraw, no Transfer."
							}
						</li>
						<li>
							<strong>Crypto wallets</strong>
							{
								" — paste public addresses only. They are read keyless; no key or secret is ever involved."
							}
						</li>
					</ul>
				</div>
			</div>
		</section>

		<section className="content-section alt" aria-labelledby="provenance-h">
			<div className="wrap">
				<div className="section-head">
					<h2 id="provenance-h">Release provenance</h2>
				</div>
				<div className="prose">
					<p>
						{"Every "}
						<code>.mcpb</code>
						{
							" is built in GitHub Actions with a build-provenance attestation, so you can confirm the file you downloaded was produced by the public CI from this source — not swapped or tampered with. Verify it before installing:"
						}
					</p>
					<CodeBlock>
						{
							"# checks the download against its signed build provenance\ngh attestation verify fenek-portfolio-companion.mcpb \\\n  --repo Guck111/fenek-portfolio-companion"
						}
					</CodeBlock>
					<p>
						{"A genuine download prints "}
						<code>✓ Verification succeeded!</code>
						{
							". Anything else means the file did not come from this repository’s CI — don’t install it."
						}
					</p>
				</div>
			</div>
		</section>
	</>
)

export default SecurityPage
