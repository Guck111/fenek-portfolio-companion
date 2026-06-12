import Link from "next/link"
import { LogoMark } from "@/components/ui/icons"
import type { Dictionary } from "@/lib/dictionaries"
import { type Lang, localizedHref } from "@/lib/i18n"
import { GITHUB_ISSUES_URL, GITHUB_LICENSE_URL, GITHUB_URL } from "@/lib/site"

const ext = { target: "_blank", rel: "noopener noreferrer" } as const

type SiteFooterProps = {
	dict: Dictionary
	lang: Lang
}

export const SiteFooter = ({ dict, lang }: SiteFooterProps) => {
	const f = dict.footer
	return (
		<footer className="site-footer">
			<div className="wrap">
				<div className="footer-top">
					<div className="footer-brand">
						<div className="b">
							<LogoMark className="mark" />
							<span>Fenek</span>
						</div>
						<p>{f.tagline}</p>
					</div>
					<div className="footer-cols">
						<div className="footer-col">
							<h4>{f.colProduct}</h4>
							<ul>
								<li>
									<Link href={localizedHref(lang, "/")}>{f.home}</Link>
								</li>
								<li>
									<Link href={localizedHref(lang, "/security")}>{f.security}</Link>
								</li>
								<li>
									<Link href={localizedHref(lang, "/install")}>{f.install}</Link>
								</li>
								<li>
									<Link href={localizedHref(lang, "/changelog")}>{f.changelog}</Link>
								</li>
							</ul>
						</div>
						<div className="footer-col">
							<h4>{f.colLegal}</h4>
							<ul>
								<li>
									<Link href={localizedHref(lang, "/privacy")}>{f.privacy}</Link>
								</li>
							</ul>
						</div>
						<div className="footer-col">
							<h4>{f.colSource}</h4>
							<ul>
								<li>
									<a href={GITHUB_URL} {...ext}>
										{f.github}
									</a>
								</li>
								<li>
									<a href={GITHUB_LICENSE_URL} {...ext}>
										{f.license}
									</a>
								</li>
								<li>
									<a href={GITHUB_ISSUES_URL} {...ext}>
										{f.support}
									</a>
								</li>
							</ul>
						</div>
					</div>
				</div>
				<div className="footer-legal">
					<p className="disc-strong">{f.disc1}</p>
					<p>{f.disc2}</p>
					<div className="footer-meta">
						<span>{f.meta1}</span>
						<span>{f.meta2}</span>
					</div>
				</div>
			</div>
		</footer>
	)
}
