import type { ToolBinding } from "../../brokers/base.js"
import type { Locale } from "../../i18n/index.js"

import { createAnalyzeConcentrationPlaybook } from "./analyze_concentration.js"
import { createAnalyzeOverviewPlaybook } from "./analyze_overview.js"
import { createReviewDividendsPlaybook } from "./review_dividends.js"
import { createReviewPiePlaybook } from "./review_pie.js"

export function createPlaybookTools(locale: Locale): readonly ToolBinding[] {
  return [
    createAnalyzeOverviewPlaybook(locale),
    createAnalyzeConcentrationPlaybook(locale),
    createReviewPiePlaybook(locale),
    createReviewDividendsPlaybook(locale),
  ]
}
