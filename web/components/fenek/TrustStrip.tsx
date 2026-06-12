import Link from "next/link"

const ITEMS = [
	"Read-only by design",
	"Keys in your OS keychain",
	"Zero telemetry",
	"Open source (MIT)",
]

export const TrustStrip = () => (
	<section className="trust-strip" aria-label="Why you can trust Fenek">
		<div className="wrap">
			<div className="chips chips-center">
				{ITEMS.map((label) => (
					<Link key={label} className="chip chip-link" href="/security">
						<span className="tick" />
						<span>{label}</span>
					</Link>
				))}
			</div>
		</div>
	</section>
)
