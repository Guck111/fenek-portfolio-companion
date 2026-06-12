import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
	title: "Privacy",
	description:
		"Fenek collects nothing. The extension runs locally, this website has no analytics or cookies, and the newsletter is the only place an email is ever stored.",
}

const PrivacyPage = () => (
	<>
		<section className="page-intro">
			<div className="wrap">
				<p className="eyebrow">Privacy</p>
				<h1>Privacy policy</h1>
				<p className="page-sub">
					The short version: Fenek collects nothing. Here is the long version.
				</p>
			</div>
		</section>

		<section className="content-section">
			<div className="wrap">
				<div className="prose">
					<h2>The extension</h2>
					<p>
						{
							"Fenek Portfolio Companion does not collect, store, or transmit your personal data. The extension runs locally and talks only to the APIs listed on the "
						}
						<Link href="/security">Security page</Link>
						{". We run no servers and receive nothing."}
					</p>

					<h2>This website</h2>
					<p>This website sets no cookies and runs no analytics or third-party scripts.</p>

					<h2>Newsletter</h2>
					<p>
						{
							"If you subscribe, your email is stored by Buttondown (our newsletter provider) and used only to send release notes and product updates. Unsubscribe anytime; see "
						}
						<a
							href="https://buttondown.com/legal/privacy"
							target="_blank"
							rel="noopener noreferrer"
						>
							Buttondown’s privacy policy
						</a>
						{"."}
					</p>

					<h2>Future Pro subscriptions</h2>
					<p>
						Future Pro subscriptions will be processed by a merchant of record; payment data never
						reaches us. The extension’s license check sends only the license key.
					</p>
				</div>
			</div>
		</section>
	</>
)

export default PrivacyPage
