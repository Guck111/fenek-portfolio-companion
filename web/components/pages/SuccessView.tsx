import Link from "next/link"
import { SiteShell } from "@/components/fenek/SiteShell"
import type { Dictionary } from "@/lib/dictionaries"
import { type Lang, localizedHref } from "@/lib/i18n"
import { RichText } from "@/lib/markdown"
import { POLAR_PORTAL_URL } from "@/lib/site"

export const SuccessView = ({ dict, lang }: { dict: Dictionary; lang: Lang }) => {
	const t = dict.success
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
					<div className="section-head">
						<h2>{t.activate.h2}</h2>
					</div>
					<div className="prose">
						<ol className="numbered">
							{t.activate.steps.map((item) => (
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

			<section className="content-section alt">
				<div className="wrap">
					<div className="section-head">
						<h2>{t.manage.h2}</h2>
					</div>
					<div className="prose">
						<p>{t.manage.body}</p>
					</div>
					<div className="cta-row">
						<a
							className="btn btn-sec"
							href={POLAR_PORTAL_URL}
							target="_blank"
							rel="noopener noreferrer"
						>
							<span>{t.manage.button}</span>
						</a>
					</div>
					<p className="newsletter-note">{t.note}</p>
					<div className="cta-row">
						<Link className="install-guide" href={localizedHref(lang, "/")}>
							{t.cta.home}
						</Link>
						<Link className="install-guide" href={localizedHref(lang, "/install")}>
							{t.cta.install}
						</Link>
					</div>
				</div>
			</section>
		</SiteShell>
	)
}
