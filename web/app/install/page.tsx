import type { Metadata } from "next"
import { DemoFrame } from "@/components/fenek/DemoFrame"
import { DownloadButton } from "@/components/ui/DownloadButton"
import { NewsletterForm } from "@/components/ui/NewsletterForm"
import { RELEASES_LATEST_URL } from "@/lib/site"

export const metadata: Metadata = {
	title: "Install",
	description:
		"Install Fenek for Claude Desktop: download the .mcpb, double-click to install, paste your read-only keys, and ask Claude about your portfolio.",
}

const InstallPage = () => (
	<>
		<section className="hero" aria-labelledby="install-h">
			<div className="wrap">
				<div className="hero-grid">
					<div className="hero-text">
						<p className="eyebrow">Install</p>
						<h1 id="install-h">Install Fenek</h1>
						<p className="lede">
							One file, double-click to install. No account, no backend — about two minutes.
						</p>
						<div className="cta-row">
							<DownloadButton />
						</div>
					</div>
					<div className="hero-art">
						<DemoFrame label="Installing Fenek" caption="Install walkthrough coming soon" />
					</div>
				</div>
			</div>
		</section>

		<section className="content-section" aria-labelledby="steps-h">
			<div className="wrap">
				<div className="section-head">
					<h2 id="steps-h">Step by step</h2>
				</div>
				<div className="prose">
					<ol className="numbered">
						<li>
							<span>
								<strong>Download the .mcpb</strong>
								{" from the "}
								<a href={RELEASES_LATEST_URL} target="_blank" rel="noopener noreferrer">
									latest GitHub release
								</a>
								{"."}
							</span>
						</li>
						<li>
							<span>
								<strong>Double-click the file.</strong>
								{" Claude Desktop opens and asks to install."}
							</span>
						</li>
						<li>
							<span>
								<strong>Open Settings → Extensions → Fenek</strong>
								{" and paste your read-only keys."}
							</span>
						</li>
						<li>
							<span>
								<strong>Start a chat</strong>
								{" and run "}
								<code>fenek_getting_started</code>
								{"."}
							</span>
						</li>
					</ol>
				</div>
			</div>
		</section>

		<section className="content-section alt" aria-labelledby="updates-h">
			<div className="wrap">
				<div className="section-head">
					<h2 id="updates-h">Updates</h2>
				</div>
				<div className="prose">
					<p>
						Manual installs don’t auto-update. Subscribe to release notes below — and Fenek itself
						will remind you in chat when a new version is out.
					</p>
				</div>
				<NewsletterForm tag="release-notes" buttonLabel="Get release notes" />
			</div>
		</section>
	</>
)

export default InstallPage
