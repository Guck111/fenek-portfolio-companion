import { CheckoutCancelledView } from "@/components/pages/CheckoutCancelledView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

export const metadata = buildMetadata("checkoutCancelled", "ru", getDictionary("ru"), true)

const Page = () => <CheckoutCancelledView dict={getDictionary("ru")} lang="ru" />

export default Page
