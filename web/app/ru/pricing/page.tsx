import { PricingView } from "@/components/pages/PricingView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

export const metadata = buildMetadata("pricing", "ru", getDictionary("ru"))

const Page = () => <PricingView dict={getDictionary("ru")} lang="ru" />

export default Page
