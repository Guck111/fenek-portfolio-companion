import { LegalDocView } from "@/components/pages/LegalDocView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

const dict = getDictionary("en")

export const metadata = buildMetadata("terms", "en", dict)

const Page = () => <LegalDocView dict={dict} lang="en" doc={dict.terms} />

export default Page
