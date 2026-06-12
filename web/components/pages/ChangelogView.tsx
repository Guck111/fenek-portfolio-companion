import { SiteShell } from "@/components/fenek/SiteShell"
import { NewsletterForm } from "@/components/ui/NewsletterForm"
import { loadChangelog } from "@/lib/changelog"
import type { Dictionary } from "@/lib/dictionaries"
import type { Lang } from "@/lib/i18n"
import { RichText } from "@/lib/markdown"

// The changelog shell is localized; the release entries themselves come from the
// repository's CHANGELOG.md and stay in their original (English) wording.
export const ChangelogView = ({ dict, lang }: { dict: Dictionary; lang: Lang }) => {
	const t = dict.changelog
	const c = dict.common
	const releases = loadChangelog()
	return (
		<SiteShell dict={dict} lang={lang}>
			<section className="page-intro">
				<div className="wrap">
					<p className="eyebrow">{t.intro.eyebrow}</p>
					<h1>{t.intro.h1}</h1>
					<p className="page-sub">{t.intro.sub}</p>
					<NewsletterForm
						tag="release-notes"
						buttonLabel={t.button}
						placeholder={c.emailPlaceholder}
						ariaLabel={c.emailLabel}
					/>
				</div>
			</section>

			<section className="content-section">
				<div className="wrap">
					<div className="changelog">
						{releases.map((release) => (
							<article className="release" key={release.version}>
								<div className="rel-head">
									<span className="rel-version">v{release.version}</span>
									<span className="rel-date">{release.date}</span>
								</div>
								{release.description ? (
									<p className="rel-desc">
										<RichText text={release.description} lang={lang} />
									</p>
								) : null}
								{release.sections.map((section) => (
									<div className="rel-section" key={section.title}>
										<h3>{section.title}</h3>
										<ul>
											{section.items.map((item, i) => (
												<li key={i}>
													<RichText text={item} lang={lang} />
												</li>
											))}
										</ul>
									</div>
								))}
							</article>
						))}
					</div>
				</div>
			</section>
		</SiteShell>
	)
}
