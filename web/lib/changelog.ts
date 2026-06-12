import { readFileSync } from "node:fs"
import { join } from "node:path"

export type ChangelogSection = { title: string; items: string[] }
export type Release = {
	version: string
	date: string
	description: string
	sections: ChangelogSection[]
}

// Build-time parser for the repo's CHANGELOG.md (keep-a-changelog format).
// No dependencies. Skips [Unreleased] and the link-reference footer; joins
// wrapped bullet continuations into a single item.
export const loadChangelog = (): Release[] => {
	const raw = readFileSync(join(process.cwd(), "..", "CHANGELOG.md"), "utf8")
	const releases: Release[] = []

	for (const block of raw.split(/\n## /).slice(1)) {
		const lines = block.split("\n")
		const head = lines[0] ?? ""
		const match = head.match(/\[?([\d.]+)\]?\s*-\s*(\S+)/)
		if (!match) continue

		const sections: ChangelogSection[] = []
		let description = ""

		for (const line of lines.slice(1)) {
			if (line.startsWith("### ")) {
				sections.push({ title: line.slice(4).trim(), items: [] })
			} else if (line.startsWith("- ")) {
				sections.at(-1)?.items.push(line.slice(2).trim())
			} else if (line.trim() !== "" && !line.startsWith("[")) {
				const section = sections.at(-1)
				if (!section) {
					description = description ? `${description} ${line.trim()}` : line.trim()
				} else if (section.items.length > 0) {
					const last = section.items.length - 1
					section.items[last] = `${section.items[last]} ${line.trim()}`
				}
			}
		}

		releases.push({ version: match[1] ?? "", date: match[2] ?? "", description, sections })
	}

	return releases
}
