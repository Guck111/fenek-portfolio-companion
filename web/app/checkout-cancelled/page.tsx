import { CheckoutCancelledView } from "@/components/pages/CheckoutCancelledView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"
import { PaidRouteGate } from "@/lib/paid-route"

export const metadata = buildMetadata("checkoutCancelled", "en", getDictionary("en"), true)

const Page = () => (
	<PaidRouteGate lang="en">
		<CheckoutCancelledView dict={getDictionary("en")} lang="en" />
	</PaidRouteGate>
)

export default Page
