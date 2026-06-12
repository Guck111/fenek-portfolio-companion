import type { IconProps } from "./types"

export const PlusIcon = ({ className }: IconProps) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
	</svg>
)
