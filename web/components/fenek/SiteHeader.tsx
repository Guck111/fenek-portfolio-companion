"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { GitHubIcon, LogoMark, MenuIcon } from "@/components/ui/icons"
import { GITHUB_URL } from "@/lib/site"

const NAV = [
	{ href: "/security", label: "Security" },
	{ href: "/install", label: "Install" },
	{ href: "/changelog", label: "Changelog" },
]

export const SiteHeader = () => {
	const pathname = usePathname()
	const [open, setOpen] = useState(false)
	const isCurrent = (href: string) => pathname === href || pathname === `${href}/`

	return (
		<header className="site-header">
			<div className="wrap header-row">
				<Link className="brand" href="/" aria-label="Fenek">
					<LogoMark className="mark" />
					<span>Fenek</span>
				</Link>
				<nav className={open ? "nav open" : "nav"} id="primary-nav" aria-label="Primary">
					{NAV.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							aria-current={isCurrent(item.href) ? "page" : undefined}
							onClick={() => setOpen(false)}
						>
							{item.label}
						</Link>
					))}
				</nav>
				<div className="header-tools">
					<a className="gh-link" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
						<GitHubIcon />
						<span>GitHub</span>
					</a>
					<button
						className="nav-toggle"
						type="button"
						aria-label="Menu"
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
