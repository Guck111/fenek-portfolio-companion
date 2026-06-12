import type { IconProps } from "./types"

export const MenuIcon = ({ className }: IconProps) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<path
			d="M4 7h16M4 12h16M4 17h16"
			stroke="currentColor"
			strokeWidth={1.8}
			strokeLinecap="round"
		/>
	</svg>
)
