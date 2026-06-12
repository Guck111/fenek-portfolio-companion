import { InstallView } from "@/components/pages/InstallView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

export const metadata = buildMetadata("install", "ru", getDictionary("ru"))

const Page = () => <InstallView dict={getDictionary("ru")} lang="ru" />

export default Page
