import { SuccessView } from "@/components/pages/SuccessView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"
import { PaidRouteGate } from "@/lib/paid-route"

export const metadata = buildMetadata("success", "en", getDictionary("en"), true)

const Page = () => (
	<PaidRouteGate lang="en">
		<SuccessView dict={getDictionary("en")} lang="en" />
	</PaidRouteGate>
)

export default Page
