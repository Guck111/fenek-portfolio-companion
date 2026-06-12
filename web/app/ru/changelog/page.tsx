import { ChangelogView } from "@/components/pages/ChangelogView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

export const metadata = buildMetadata("changelog", "ru", getDictionary("ru"))

const Page = () => <ChangelogView dict={getDictionary("ru")} lang="ru" />

export default Page
