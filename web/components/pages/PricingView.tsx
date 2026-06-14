import { SiteShell } from "@/components/fenek/SiteShell"
import { CheckoutButton } from "@/components/ui/CheckoutButton"
import { DownloadButton } from "@/components/ui/DownloadButton"
import { CheckIcon } from "@/components/ui/icons"
import type { Dictionary } from "@/lib/dictionaries"
import type { Lang } from "@/lib/i18n"
import { RichText } from "@/lib/markdown"

export const PricingView = ({ dict, lang }: { dict: Dictionary; lang: Lang }) => {
	const t = dict.pricing
	return (
		<SiteShell dict={dict} lang={lang}>
			<section className="page-intro">
				<div className="wrap stack-md">
					<p className="eyebrow">{t.intro.eyebrow}</p>
					<h1>{t.intro.h1}</h1>
					<p className="page-sub">{t.intro.sub}</p>
				</div>
			</section>

			<section className="content-section">
				<div className="wrap">
					<div className="plans">
						<div className="plan">
							<div className="plan-name">{t.plans.free.name}</div>
							<div className="plan-cost">
								<span className="plan-price">{t.plans.free.price}</span>
								<span className="plan-period">{t.plans.free.period}</span>
							</div>
							<p className="plan-tagline">{t.plans.free.tagline}</p>
							<ul>
								{t.plans.free.features.map((feature) => (
									<li key={feature}>
										<CheckIcon className="gi" />
										<span>{feature}</span>
									</li>
								))}
							</ul>
							<DownloadButton label={t.plans.free.cta} className="btn btn-sec" />
						</div>

						<div className="plan featured">
							<div className="plan-head">
								<div className="plan-name">{t.plans.pro.name}</div>
								<span className="plan-badge">{t.plans.pro.badge}</span>
							</div>
							<div className="plan-cost">
								<span className="plan-price">{t.plans.pro.price}</span>
								<span className="plan-period">{t.plans.pro.period}</span>
							</div>
							<p className="plan-tagline">{t.plans.pro.tagline}</p>
							<ul>
								{t.plans.pro.features.map((feature) => (
									<li key={feature}>
										<CheckIcon className="gi" />
										<span>{feature}</span>
									</li>
								))}
							</ul>
							<CheckoutButton label={t.plans.pro.cta} />
						</div>
					</div>

					<p className="note-box pricing-note">{t.note}</p>
					<p className="plan-aside">
						<RichText text={t.buildAside} lang={lang} />
					</p>
					<p className="plan-terms">
						<RichText text={t.terms} lang={lang} />
					</p>
				</div>
			</section>
		</SiteShell>
	)
}
