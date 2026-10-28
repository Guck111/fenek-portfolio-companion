import { PricingView } from "@/components/pages/PricingView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"
import { PaidRouteGate, paidRouteNoindex } from "@/lib/paid-route"

export const metadata = buildMetadata("pricing", "en", getDictionary("en"), paidRouteNoindex)

const Page = () => (
	<PaidRouteGate lang="en">
		<PricingView dict={getDictionary("en")} lang="en" />
	</PaidRouteGate>
)

export default Page
