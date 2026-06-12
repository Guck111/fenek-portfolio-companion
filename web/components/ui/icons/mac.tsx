import type { IconProps } from "./types"

export const MacIcon = ({ className }: IconProps) => (
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
		<rect x="3" y="4" width="18" height="12" rx="1.5" />
		<path d="M2 20h20M9 16l-.5 4M15 16l.5 4" />
	</svg>
)
