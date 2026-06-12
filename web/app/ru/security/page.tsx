import { SecurityView } from "@/components/pages/SecurityView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

export const metadata = buildMetadata("security", "ru", getDictionary("ru"))

const Page = () => <SecurityView dict={getDictionary("ru")} lang="ru" />

export default Page
