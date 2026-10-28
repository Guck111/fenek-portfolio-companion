import { LegalDocView } from "@/components/pages/LegalDocView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"
import { PaidRouteGate, paidRouteNoindex } from "@/lib/paid-route"

const dict = getDictionary("ru")

export const metadata = buildMetadata("refund", "ru", dict, paidRouteNoindex)

const Page = () => (
	<PaidRouteGate lang="ru">
		<LegalDocView dict={dict} lang="ru" doc={dict.refund} />
	</PaidRouteGate>
)

export default Page
