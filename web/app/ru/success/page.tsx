import { SuccessView } from "@/components/pages/SuccessView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"
import { PaidRouteGate } from "@/lib/paid-route"

export const metadata = buildMetadata("success", "ru", getDictionary("ru"), true)

const Page = () => (
	<PaidRouteGate lang="ru">
		<SuccessView dict={getDictionary("ru")} lang="ru" />
	</PaidRouteGate>
)

export default Page
