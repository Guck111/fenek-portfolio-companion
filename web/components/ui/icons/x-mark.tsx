import type { IconProps } from "./types"

export const XMarkIcon = ({ className }: IconProps) => (
	<svg
		className={className}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth={2}
		strokeLinecap="round"
		aria-hidden="true"
	>
		<path d="M7 7l10 10M17 7L7 17" />
	</svg>
)
