import type { IconProps } from "./types"

export const BankIcon = ({ className }: IconProps) => (
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
		<path d="M4 10h16M4 10L12 4l8 6M6 10v8M10 10v8M14 10v8M18 10v8M3 21h18" />
	</svg>
)
