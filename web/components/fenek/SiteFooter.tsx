import Link from "next/link"
import { LogoMark } from "@/components/ui/icons"
import { GITHUB_ISSUES_URL, GITHUB_LICENSE_URL, GITHUB_URL } from "@/lib/site"

const ext = { target: "_blank", rel: "noopener noreferrer" } as const

export const SiteFooter = () => (
	<footer className="site-footer">
		<div className="wrap">
			<div className="footer-top">
				<div className="footer-brand">
					<div className="b">
						<LogoMark className="mark" />
						<span>Fenek</span>
					</div>
					<p>
						A read-only portfolio companion for Claude Desktop. It runs on your machine and reads
						your data — it never moves a thing.
					</p>
				</div>
				<div className="footer-cols">
					<div className="footer-col">
						<h4>Product</h4>
						<ul>
							<li>
								<Link href="/">Home</Link>
							</li>
							<li>
								<Link href="/security">Security</Link>
							</li>
							<li>
								<Link href="/install">Install</Link>
							</li>
							<li>
								<Link href="/changelog">Changelog</Link>
							</li>
						</ul>
					</div>
					<div className="footer-col">
						<h4>Legal</h4>
						<ul>
							<li>
								<Link href="/privacy">Privacy</Link>
							</li>
						</ul>
					</div>
					<div className="footer-col">
						<h4>Source</h4>
						<ul>
							<li>
								<a href={GITHUB_URL} {...ext}>
									GitHub
								</a>
							</li>
							<li>
								<a href={GITHUB_LICENSE_URL} {...ext}>
									License (MIT)
								</a>
							</li>
							<li>
								<a href={GITHUB_ISSUES_URL} {...ext}>
									Support
								</a>
							</li>
						</ul>
					</div>
				</div>
			</div>
			<div className="footer-legal">
				<p className="disc-strong">
					Fenek Portfolio Companion is open source (MIT). Not affiliated with any broker or
					exchange.
				</p>
				<p>Not investment advice — Fenek only reads and organizes your own data.</p>
				<div className="footer-meta">
					<span>Read-only · Zero telemetry</span>
					<span>Runs locally in Claude Desktop</span>
				</div>
			</div>
		</div>
	</footer>
)
