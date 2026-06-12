import type { IconProps } from "./types"

export const PlayIcon = ({ className }: IconProps) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.6} />
		<path d="M10 8.5l5.5 3.5-5.5 3.5z" fill="currentColor" />
	</svg>
)
