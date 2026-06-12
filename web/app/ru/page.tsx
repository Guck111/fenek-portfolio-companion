import { HomeView } from "@/components/pages/HomeView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

export const metadata = buildMetadata("home", "ru", getDictionary("ru"))

const Page = () => <HomeView dict={getDictionary("ru")} lang="ru" />

export default Page
