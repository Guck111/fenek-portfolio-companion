import { SuccessView } from "@/components/pages/SuccessView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

export const metadata = buildMetadata("success", "ru", getDictionary("ru"), true)

const Page = () => <SuccessView dict={getDictionary("ru")} lang="ru" />

export default Page
