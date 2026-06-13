import Link from "next/link"
import { DemoFrame } from "@/components/fenek/DemoFrame"
import { SiteShell } from "@/components/fenek/SiteShell"
import { TrustStrip } from "@/components/fenek/TrustStrip"
import { CheckoutButton } from "@/components/ui/CheckoutButton"
import { DownloadButton } from "@/components/ui/DownloadButton"
import { DownloadIcon, GitHubIcon } from "@/components/ui/icons"
import { NewsletterForm } from "@/components/ui/NewsletterForm"
import type { Dictionary } from "@/lib/dictionaries"
import { type Lang, localizedHref } from "@/lib/i18n"
import { RichText } from "@/lib/markdown"
import { GITHUB_URL } from "@/lib/site"

export const HomeView = ({ dict, lang }: { dict: Dictionary; lang: Lang }) => {
	const t = dict.home
	const c = dict.common
	return (
		<SiteShell dict={dict} lang={lang}>
			<section className="hero" aria-labelledby="hero-h">
				<div className="wrap">
					<div className="hero-grid">
						<div className="hero-text">
							<p className="eyebrow">{t.hero.eyebrow}</p>
							<h1 id="hero-h" className="hero-name">
								{t.hero.h1}
							</h1>
							<p className="lede">{t.hero.lede}</p>
							<div className="cta-row">
								<a className="btn btn-pri" href="#install">
									<DownloadIcon />
									<span>{c.download}</span>
								</a>
								<a
									className="btn btn-sec"
									href={GITHUB_URL}
									target="_blank"
									rel="noopener noreferrer"
								>
									<GitHubIcon />
									<span>{c.viewSource}</span>
								</a>
							</div>
						</div>
						<div className="hero-art">
							<DemoFrame label={t.hero.demoLabel} caption={t.hero.demoCaption} />
						</div>
					</div>
				</div>
			</section>

			<TrustStrip items={t.trust} lang={lang} />

			<section aria-labelledby="how-h">
				<div className="wrap">
					<div className="section-head">
						<h2 id="how-h">{t.how.h2}</h2>
						<p>{t.how.lede}</p>
					</div>
					<div className="steps">
						{t.how.steps.map((step, i) => (
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
						<h2 id="src-h">{t.sources.h2}</h2>
						<p>{t.sources.lede}</p>
					</div>
					<div className="source-grid">
						{t.sources.items.map((source) => (
							<div className="source" key={source.name}>
								<div className="nm">{source.name}</div>
								<div className="ty">{source.type}</div>
								<div className="extra">{source.extra}</div>
							</div>
						))}
					</div>
					<div className="vote-row">
						<p className="kicker">{t.sources.voteKicker}</p>
						<NewsletterForm
							tag="next-broker"
							buttonLabel={t.sources.voteButton}
							placeholder={c.emailPlaceholder}
							ariaLabel={c.emailLabel}
							extraField={{
								name: "metadata__requested_source",
								label: t.sources.voteFieldLabel,
								placeholder: t.sources.voteFieldPlaceholder,
							}}
						/>
					</div>
				</div>
			</section>

			<section aria-labelledby="pricing-h">
				<div className="wrap">
					<div className="callout">
						<span className="free-badge">
							<span className="tick" />
							{t.pricing.badge}
						</span>
						<h2 id="pricing-h">{t.pricing.h2}</h2>
						<p>{t.pricing.body}</p>
						<p className="callout-aside">
							<RichText text={t.pricing.aside} lang={lang} />
						</p>
						<div className="cta-row">
							<CheckoutButton label={t.pricing.button} />
						</div>
					</div>
				</div>
			</section>

			<section className="alt" id="install" aria-labelledby="install-h">
				<div className="wrap">
					<div className="cta-center">
						<p className="eyebrow">{t.install.eyebrow}</p>
						<h2 id="install-h">{t.install.h2}</h2>
						<p className="section-lead">{t.install.lede}</p>
						<div className="cta-row">
							<DownloadButton label={c.download} />
						</div>
						<Link className="install-guide" href={localizedHref(lang, "/install")}>
							{t.install.guide}
						</Link>
					</div>
				</div>
			</section>
		</SiteShell>
	)
}
