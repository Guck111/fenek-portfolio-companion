import type { IconProps } from "./types"

export const ChevronIcon = ({ className }: IconProps) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<path
			d="M6 9l6 6 6-6"
			stroke="currentColor"
			strokeWidth={1.8}
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
)
