import type { Metadata } from "next"
import type { ReactNode } from "react"
import { NewsletterForm } from "@/components/ui/NewsletterForm"
import { loadChangelog } from "@/lib/changelog"

export const metadata: Metadata = {
	title: "Changelog",
	description: "Every released version of Fenek Portfolio Companion, straight from the repository.",
}

// Render the small slice of Markdown that appears in changelog entries —
// **bold**, `code`, and [text](url) — as React nodes. Never raw HTML.
const renderInline = (text: string): ReactNode[] => {
	const nodes: ReactNode[] = []
	const pattern = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g
	let lastIndex = 0
	let key = 0

	for (const match of text.matchAll(pattern)) {
		const index = match.index ?? 0
		if (index > lastIndex) nodes.push(text.slice(lastIndex, index))
		const [whole, linkText, linkUrl, code, bold] = match
		if (linkText !== undefined && linkUrl !== undefined) {
			const external = /^https?:/.test(linkUrl)
			nodes.push(
				<a
					key={key++}
					href={linkUrl}
					{...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
				>
					{linkText}
				</a>,
			)
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

const ChangelogPage = () => {
	const releases = loadChangelog()
	return (
		<>
			<section className="page-intro">
				<div className="wrap">
					<p className="eyebrow">Changelog</p>
					<h1>Changelog</h1>
					<p className="page-sub">
						Every released version of Fenek. Don’t want to check this page? Get release notes by
						email.
					</p>
					<NewsletterForm tag="release-notes" buttonLabel="Get release notes" />
				</div>
			</section>

			<section className="content-section">
				<div className="wrap">
					<div className="changelog">
						{releases.map((release) => (
							<article className="release" key={release.version}>
								<div className="rel-head">
									<span className="rel-version">v{release.version}</span>
									<span className="rel-date">{release.date}</span>
								</div>
								{release.description ? (
									<p className="rel-desc">{renderInline(release.description)}</p>
								) : null}
								{release.sections.map((section) => (
									<div className="rel-section" key={section.title}>
										<h3>{section.title}</h3>
										<ul>
											{section.items.map((item, i) => (
												<li key={i}>{renderInline(item)}</li>
											))}
										</ul>
									</div>
								))}
							</article>
						))}
					</div>
				</div>
			</section>
		</>
	)
}

export default ChangelogPage
