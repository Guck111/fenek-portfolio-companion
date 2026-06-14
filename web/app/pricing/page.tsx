import { PricingView } from "@/components/pages/PricingView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

export const metadata = buildMetadata("pricing", "en", getDictionary("en"))

const Page = () => <PricingView dict={getDictionary("en")} lang="en" />

export default Page
