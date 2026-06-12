import type { IconProps } from "./types"

export const AuthorIcon = ({ className }: IconProps) => (
	<svg
		className={className}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth={1.6}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<circle cx="12" cy="8" r="3.2" />
		<path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
	</svg>
)
