import type { ReactNode } from "react"
import { SiteFooter } from "@/components/fenek/SiteFooter"
import { SiteHeader } from "@/components/fenek/SiteHeader"
import type { Dictionary } from "@/lib/dictionaries"
import type { Lang } from "@/lib/i18n"

type SiteShellProps = {
	dict: Dictionary
	lang: Lang
	children: ReactNode
}

// Locale-aware page chrome. The content language is scoped on <main lang> so the
// document stays valid even though the root <html lang> is the default locale.
export const SiteShell = ({ dict, lang, children }: SiteShellProps) => (
	<>
		<a className="skip" href="#app">
			{dict.common.skip}
		</a>
		<SiteHeader lang={lang} nav={dict.nav} />
		<main id="app" lang={lang}>
			{children}
		</main>
		<SiteFooter dict={dict} lang={lang} />
	</>
)
