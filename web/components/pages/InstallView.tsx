import { DemoFrame } from "@/components/fenek/DemoFrame"
import { SiteShell } from "@/components/fenek/SiteShell"
import { DownloadButton } from "@/components/ui/DownloadButton"
import { NewsletterForm } from "@/components/ui/NewsletterForm"
import type { Dictionary } from "@/lib/dictionaries"
import type { Lang } from "@/lib/i18n"
import { RichText } from "@/lib/markdown"

export const InstallView = ({ dict, lang }: { dict: Dictionary; lang: Lang }) => {
	const t = dict.install
	const c = dict.common
	return (
		<SiteShell dict={dict} lang={lang}>
			<section className="hero" aria-labelledby="install-h">
				<div className="wrap">
					<div className="hero-grid">
						<div className="hero-text">
							<p className="eyebrow">{t.hero.eyebrow}</p>
							<h1 id="install-h">{t.hero.h1}</h1>
							<p className="lede">{t.hero.lede}</p>
							<div className="cta-row">
								<DownloadButton label={c.download} />
							</div>
						</div>
						<div className="hero-art">
							<DemoFrame label={t.hero.demoLabel} caption={t.hero.demoCaption} />
						</div>
					</div>
				</div>
			</section>

			<section className="content-section" aria-labelledby="steps-h">
				<div className="wrap">
					<div className="section-head">
						<h2 id="steps-h">{t.steps.h2}</h2>
					</div>
					<div className="prose">
						<ol className="numbered">
							{t.steps.items.map((item) => (
								<li key={item}>
									<span>
										<RichText text={item} lang={lang} />
									</span>
								</li>
							))}
						</ol>
					</div>
				</div>
			</section>

			<section className="content-section alt" aria-labelledby="updates-h">
				<div className="wrap">
					<div className="section-head">
						<h2 id="updates-h">{t.updates.h2}</h2>
					</div>
					<div className="prose">
						<p>{t.updates.body}</p>
					</div>
					<NewsletterForm
						tag="release-notes"
						buttonLabel={t.updates.button}
						placeholder={c.emailPlaceholder}
						ariaLabel={c.emailLabel}
					/>
				</div>
			</section>
		</SiteShell>
	)
}
