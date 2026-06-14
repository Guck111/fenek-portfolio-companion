import { LegalDocView } from "@/components/pages/LegalDocView"
import { getDictionary } from "@/lib/dictionaries"
import { buildMetadata } from "@/lib/metadata"

const dict = getDictionary("en")

export const metadata = buildMetadata("refund", "en", dict)

const Page = () => <LegalDocView dict={dict} lang="en" doc={dict.refund} />

export default Page
