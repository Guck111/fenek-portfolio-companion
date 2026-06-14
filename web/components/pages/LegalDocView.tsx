import { Fragment } from "react"
import { SiteShell } from "@/components/fenek/SiteShell"
import type { Dictionary } from "@/lib/dictionaries"
import type { Lang } from "@/lib/i18n"
import { RichText } from "@/lib/markdown"

// Shared layout for plain prose legal documents (Terms, Refunds). The page
// supplies its own intro + sections slice from the dictionary.
type LegalDoc = {
	intro: { eyebrow: string; h1: string; sub: string }
	sections: ReadonlyArray<{ h2: string; body: string }>
}

type LegalDocViewProps = {
	dict: Dictionary
	lang: Lang
	doc: LegalDoc
}

export const LegalDocView = ({ dict, lang, doc }: LegalDocViewProps) => (
	<SiteShell dict={dict} lang={lang}>
		<section className="page-intro">
			<div className="wrap">
				<p className="eyebrow">{doc.intro.eyebrow}</p>
				<h1>{doc.intro.h1}</h1>
				<p className="page-sub">{doc.intro.sub}</p>
			</div>
		</section>

		<section className="content-section">
			<div className="wrap">
				<div className="prose">
					{doc.sections.map((entry) => (
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
