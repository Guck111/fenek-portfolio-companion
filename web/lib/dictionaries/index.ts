import type { Lang } from "@/lib/i18n"
import { type Dictionary, en } from "./en"
import { ru } from "./ru"

const dictionaries: Record<Lang, Dictionary> = { en, ru }

export const getDictionary = (lang: Lang): Dictionary => dictionaries[lang]

export type { Dictionary }
