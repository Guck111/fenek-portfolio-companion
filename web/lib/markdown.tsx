import type { ReactNode } from "react"
import Link from "next/link"
import { type Lang, localizedHref } from "@/lib/i18n"

// Inline markdown used inside dictionary strings: **bold**, `code`, and
// [text](url). Internal links (starting with "/") are localized to the current
// locale; http(s) links open in a new tab; other schemes (mailto:, tel:) render
// as a plain link. Plain text in — never raw HTML.
export const renderRichText = (text: string, lang: Lang): ReactNode[] => {
	const nodes: ReactNode[] = []
	const pattern = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g
	let lastIndex = 0
	let key = 0

	for (const match of text.matchAll(pattern)) {
		const index = match.index ?? 0
		if (index > lastIndex) nodes.push(text.slice(lastIndex, index))
		const [whole, linkText, linkUrl, code, bold] = match
		if (linkText !== undefined && linkUrl !== undefined) {
			if (linkUrl.startsWith("/")) {
				nodes.push(
					<Link key={key++} href={localizedHref(lang, linkUrl)}>
						{linkText}
					</Link>,
				)
			} else if (/^https?:/.test(linkUrl)) {
				nodes.push(
					<a key={key++} href={linkUrl} target="_blank" rel="noopener noreferrer">
						{linkText}
					</a>,
				)
			} else {
				nodes.push(
					<a key={key++} href={linkUrl}>
						{linkText}
					</a>,
				)
			}
		} else if (code !== undefined) {
			nodes.push(<code key={key++}>{code}</code>)
		} else if (bold !== undefined) {
			nodes.push(<strong key={key++}>{bold}</strong>)
		}
		lastIndex = index + whole.length
	}
	if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
	return nodes
}

type RichTextProps = {
	text: string
	lang: Lang
}

export const RichText = ({ text, lang }: RichTextProps) => <>{renderRichText(text, lang)}</>
