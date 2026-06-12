import type { IconProps } from "./types"

export const CoinsIcon = ({ className }: IconProps) => (
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
		<ellipse cx="12" cy="6.5" rx="7" ry="3" />
		<path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
		<path d="M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
	</svg>
)
