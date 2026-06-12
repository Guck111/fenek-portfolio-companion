import { Fragment } from "react"
import { SiteShell } from "@/components/fenek/SiteShell"
import type { Dictionary } from "@/lib/dictionaries"
import type { Lang } from "@/lib/i18n"
import { RichText } from "@/lib/markdown"

export const PrivacyView = ({ dict, lang }: { dict: Dictionary; lang: Lang }) => {
	const t = dict.privacy
	return (
		<SiteShell dict={dict} lang={lang}>
			<section className="page-intro">
				<div className="wrap">
					<p className="eyebrow">{t.intro.eyebrow}</p>
					<h1>{t.intro.h1}</h1>
					<p className="page-sub">{t.intro.sub}</p>
				</div>
			</section>

			<section className="content-section">
				<div className="wrap">
					<div className="prose">
						{t.sections.map((entry) => (
							<Fragment key={entry.h2}>
								<h2>{entry.h2}</h2>
								<p>
									<RichText text={entry.body} lang={lang} />
								</p>
							</Fragment>
						))}
					</div>
				</div>
			</section>
		</SiteShell>
	)
}
