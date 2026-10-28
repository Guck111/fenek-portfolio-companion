import { PricingView } from "@/components/pages/PricingView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"
import { PaidRouteGate, paidRouteNoindex } from "@/lib/paid-route"

export const metadata = buildMetadata("pricing", "ru", getDictionary("ru"), paidRouteNoindex)

const Page = () => (
	<PaidRouteGate lang="ru">
		<PricingView dict={getDictionary("ru")} lang="ru" />
	</PaidRouteGate>
)

export default Page
