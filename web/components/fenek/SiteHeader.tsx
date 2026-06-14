"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { LanguageSwitcher } from "@/components/fenek/LanguageSwitcher"
import { GitHubIcon, LogoMark, MenuIcon } from "@/components/ui/icons"
import type { Dictionary } from "@/lib/dictionaries"
import { type Lang, localizedHref, stripLocale } from "@/lib/i18n"
import { GITHUB_URL } from "@/lib/site"

type SiteHeaderProps = {
	lang: Lang
	nav: Dictionary["nav"]
}

export const SiteHeader = ({ lang, nav }: SiteHeaderProps) => {
	const pathname = usePathname()
	const [open, setOpen] = useState(false)
	const canonical = stripLocale(pathname)
	const items = [
		{ path: "/security", label: nav.security },
		{ path: "/pricing", label: nav.pricing },
		{ path: "/install", label: nav.install },
		{ path: "/changelog", label: nav.changelog },
	]
	const isCurrent = (path: string) => canonical === path || canonical === `${path}/`

	return (
		<header className="site-header">
			<div className="wrap header-row">
				<Link className="brand" href={localizedHref(lang, "/")} aria-label="Fenek">
					<LogoMark className="mark" />
					<span>Fenek</span>
				</Link>
				<nav className={open ? "nav open" : "nav"} id="primary-nav" aria-label={nav.primary}>
					{items.map((item) => (
						<Link
							key={item.path}
							href={localizedHref(lang, item.path)}
							aria-current={isCurrent(item.path) ? "page" : undefined}
							onClick={() => setOpen(false)}
						>
							{item.label}
						</Link>
					))}
				</nav>
				<div className="header-tools">
					<LanguageSwitcher lang={lang} label={nav.chooseLanguage} />
					<a
						className="gh-link"
						href={GITHUB_URL}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={nav.github}
					>
						<GitHubIcon />
						<span>{nav.github}</span>
					</a>
					<button
						className="nav-toggle"
						type="button"
						aria-label={nav.menu}
						aria-expanded={open}
						aria-controls="primary-nav"
						onClick={() => setOpen((value) => !value)}
					>
						<MenuIcon />
					</button>
				</div>
			</div>
		</header>
	)
}
