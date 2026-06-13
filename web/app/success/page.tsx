import { SuccessView } from "@/components/pages/SuccessView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

export const metadata = buildMetadata("success", "en", getDictionary("en"), true)

const Page = () => <SuccessView dict={getDictionary("en")} lang="en" />

export default Page
