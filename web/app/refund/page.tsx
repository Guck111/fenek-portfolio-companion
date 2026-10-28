import { LegalDocView } from "@/components/pages/LegalDocView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"
import { PaidRouteGate, paidRouteNoindex } from "@/lib/paid-route"

const dict = getDictionary("en")

export const metadata = buildMetadata("refund", "en", dict, paidRouteNoindex)

const Page = () => (
	<PaidRouteGate lang="en">
		<LegalDocView dict={dict} lang="en" doc={dict.refund} />
	</PaidRouteGate>
)

export default Page
