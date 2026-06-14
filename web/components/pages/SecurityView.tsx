import { DataFlow } from "@/components/fenek/DataFlow"
import { SiteShell } from "@/components/fenek/SiteShell"
import { CodeBlock } from "@/components/ui/CodeBlock"
import type { Dictionary } from "@/lib/dictionaries"
import type { Lang } from "@/lib/i18n"
import { RichText } from "@/lib/markdown"

export const SecurityView = ({ dict, lang }: { dict: Dictionary; lang: Lang }) => {
	const t = dict.security
	return (
		<SiteShell dict={dict} lang={lang}>
			<section className="page-intro">
				<div className="wrap stack-md">
					<p className="eyebrow">{t.intro.eyebrow}</p>
					<h1>{t.intro.h1}</h1>
					<p className="page-sub">{t.intro.sub}</p>
				</div>
			</section>

			<section className="trust">
				<div className="wrap">
					<DataFlow flow={t.flow} />
				</div>
			</section>

			<section className="content-section" aria-labelledby="outbound-h">
				<div className="wrap">
					<div className="section-head mb-xl">
						<h2 id="outbound-h">{t.outbound.h2}</h2>
					</div>
					<div className="prose">
						<p>{t.outbound.lead}</p>
						<ol className="numbered">
							{t.outbound.items.map((item) => (
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

			<section className="content-section alt" aria-labelledby="verify-h">
				<div className="wrap">
					<div className="section-head mb-xl">
						<h2 id="verify-h">{t.verify.h2}</h2>
					</div>
					<div className="prose">
						<p>{t.verify.p1}</p>
						<CodeBlock>{t.verify.cmd}</CodeBlock>
						<p>
							<RichText text={t.verify.p2} lang={lang} />
						</p>
					</div>
				</div>
			</section>

			<section className="content-section" aria-labelledby="keys-h">
				<div className="wrap">
					<div className="section-head mb-xl">
						<h2 id="keys-h">{t.keys.h2}</h2>
					</div>
					<div className="prose">
						<p>{t.keys.p1}</p>
						<p>{t.keys.p2}</p>
						<ul>
							{t.keys.items.map((item) => (
								<li key={item}>
									<RichText text={item} lang={lang} />
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>

			<section className="content-section alt" aria-labelledby="provenance-h">
				<div className="wrap">
					<div className="section-head mb-xl">
						<h2 id="provenance-h">{t.provenance.h2}</h2>
					</div>
					<div className="prose">
						<p>
							<RichText text={t.provenance.p1} lang={lang} />
						</p>
						<CodeBlock>{t.provenance.cmd}</CodeBlock>
						<p>
							<RichText text={t.provenance.p2} lang={lang} />
						</p>
					</div>
				</div>
			</section>
		</SiteShell>
	)
}
