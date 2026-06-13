import { CheckoutCancelledView } from "@/components/pages/CheckoutCancelledView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

export const metadata = buildMetadata("checkoutCancelled", "en", getDictionary("en"), true)

const Page = () => <CheckoutCancelledView dict={getDictionary("en")} lang="en" />

export default Page
