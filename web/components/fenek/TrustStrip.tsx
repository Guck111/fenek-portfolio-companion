import Link from "next/link"
import { type Lang, localizedHref } from "@/lib/i18n"

type TrustStripProps = {
	items: string[]
	lang: Lang
}

export const TrustStrip = ({ items, lang }: TrustStripProps) => (
	<section className="trust-strip">
		<div className="wrap">
			<div className="chips chips-center">
				{items.map((label) => (
					<Link key={label} className="chip chip-link" href={localizedHref(lang, "/security")}>
						<span className="tick" />
						<span>{label}</span>
					</Link>
				))}
			</div>
		</div>
	</section>
)
