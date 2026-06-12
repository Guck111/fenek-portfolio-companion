import type { IconProps } from "./types"

export const BlockIcon = ({ className }: IconProps) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth={1.8} />
		<path d="M6 6l12 12" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
	</svg>
)
