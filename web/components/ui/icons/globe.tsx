import type { IconProps } from "./types"

export const GlobeIcon = ({ className }: IconProps) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.6} />
		<path
			d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"
			stroke="currentColor"
			strokeWidth={1.6}
		/>
	</svg>
)
