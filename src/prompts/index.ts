import type { PromptBinding } from "../brokers/base.js"
import type { Locale } from "../i18n/index.js"

import { createAnalyzeConcentrationPrompt } from "./analyze_concentration.js"
import { createAnalyzeOverviewPrompt } from "./analyze_overview.js"
import { createReviewDividendsPrompt } from "./review_dividends.js"
import { createReviewPiePrompt } from "./review_pie.js"

export function createCorePrompts(locale: Locale): readonly PromptBinding[] {
  return [
    createAnalyzeOverviewPrompt(locale),
    createAnalyzeConcentrationPrompt(locale),
    createReviewPiePrompt(locale),
    createReviewDividendsPrompt(locale),
  ]
}
