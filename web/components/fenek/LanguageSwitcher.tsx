"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ChevronIcon, GlobeIcon } from "@/components/ui/icons"
import { LANG_LABELS, LANGS, type Lang, swapLocalePath } from "@/lib/i18n"

type LanguageSwitcherProps = {
	lang: Lang
	label: string
}

export const LanguageSwitcher = ({ lang, label }: LanguageSwitcherProps) => {
	const pathname = usePathname()
	const [open, setOpen] = useState(false)
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const onDocClick = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
		}
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false)
		}
		document.addEventListener("click", onDocClick)
		document.addEventListener("keydown", onKey)
		return () => {
			document.removeEventListener("click", onDocClick)
			document.removeEventListener("keydown", onKey)
		}
	}, [])

	return (
		<div className="lang" ref={ref}>
			<button
				className="lang-btn"
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={label}
				onClick={(event) => {
					event.stopPropagation()
					setOpen((value) => !value)
				}}
			>
				<GlobeIcon />
				<span>{LANG_LABELS[lang].code}</span>
				<ChevronIcon />
			</button>
			<div className={open ? "lang-menu open" : "lang-menu"} role="menu">
				{LANGS.map((entry) => (
					<Link
						key={entry}
						href={swapLocalePath(pathname, entry)}
						role="menuitem"
						aria-current={entry === lang ? "true" : undefined}
						onClick={() => setOpen(false)}
					>
						<span>{LANG_LABELS[entry].name}</span>
						<span className="code">{LANG_LABELS[entry].code}</span>
					</Link>
				))}
			</div>
		</div>
	)
}
