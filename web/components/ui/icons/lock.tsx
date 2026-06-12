import type { IconProps } from "./types"

export const LockIcon = ({ className }: IconProps) => (
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
		<rect x="4.5" y="10" width="15" height="10" rx="2" />
		<path d="M8 10V7a4 4 0 0 1 8 0v3" />
	</svg>
)
