import { PrivacyView } from "@/components/pages/PrivacyView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

export const metadata = buildMetadata("privacy", "ru", getDictionary("ru"))

const Page = () => <PrivacyView dict={getDictionary("ru")} lang="ru" />

export default Page
