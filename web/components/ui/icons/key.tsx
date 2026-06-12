import type { IconProps } from "./types"

export const KeyIcon = ({ className }: IconProps) => (
	<svg
		className={className}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth={1.7}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<circle cx="8" cy="8" r="4" />
		<path d="M11 11l7 7M16 16l2-2M14 18l2-2" />
	</svg>
)
