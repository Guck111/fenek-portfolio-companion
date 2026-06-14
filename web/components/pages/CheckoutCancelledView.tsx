import Link from "next/link"
import { SiteShell } from "@/components/fenek/SiteShell"
import { CheckoutButton } from "@/components/ui/CheckoutButton"
import type { Dictionary } from "@/lib/dictionaries"
import { type Lang, localizedHref } from "@/lib/i18n"
import { RichText } from "@/lib/markdown"

export const CheckoutCancelledView = ({ dict, lang }: { dict: Dictionary; lang: Lang }) => {
	const t = dict.checkoutCancelled
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
					<div className="prose">
						<p>
							<RichText text={t.body} lang={lang} />
						</p>
					</div>
					<div className="cta-row">
						<CheckoutButton label={t.cta.retry} />
						<Link className="btn btn-sec" href={localizedHref(lang, "/")}>
							<span>{t.cta.home}</span>
						</Link>
					</div>
				</div>
			</section>
		</SiteShell>
	)
}
