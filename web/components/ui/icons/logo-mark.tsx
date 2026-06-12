import type { IconProps } from "./types"

export const LogoMark = ({ className }: IconProps) => (
	<svg
		className={className}
		viewBox="0 0 48 48"
		fill="none"
		stroke="currentColor"
		strokeWidth={2.2}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M14 26 L16 8 L20 26" />
		<path d="M34 26 L32 8 L28 26" />
		<path d="M14 26 L24 36 L34 26" />
	</svg>
)
