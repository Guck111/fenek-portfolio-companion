import { LegalDocView } from "@/components/pages/LegalDocView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

const dict = getDictionary("ru")

export const metadata = buildMetadata("terms", "ru", dict)

const Page = () => <LegalDocView dict={dict} lang="ru" doc={dict.terms} />

export default Page
