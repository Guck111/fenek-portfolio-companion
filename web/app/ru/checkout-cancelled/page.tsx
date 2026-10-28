import { CheckoutCancelledView } from "@/components/pages/CheckoutCancelledView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"
import { PaidRouteGate } from "@/lib/paid-route"

export const metadata = buildMetadata("checkoutCancelled", "ru", getDictionary("ru"), true)

const Page = () => (
	<PaidRouteGate lang="ru">
		<CheckoutCancelledView dict={getDictionary("ru")} lang="ru" />
	</PaidRouteGate>
)

export default Page
