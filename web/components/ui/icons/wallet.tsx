import type { IconProps } from "./types"

export const WalletIcon = ({ className }: IconProps) => (
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
		<rect x="3" y="6" width="18" height="13" rx="2.5" />
		<path d="M3 9.5h18M16.5 13h1.5" />
	</svg>
)
