import type { PromptBinding } from "../brokers/base.js"

import { createAnalyzeConcentrationPrompt } from "./analyze_concentration.js"
import { createAnalyzeOverviewPrompt } from "./analyze_overview.js"
import { createReviewDividendsPrompt } from "./review_dividends.js"
import { createReviewPiePrompt } from "./review_pie.js"

export function createCorePrompts(): readonly PromptBinding[] {
  return [
    createAnalyzeOverviewPrompt(),
    createAnalyzeConcentrationPrompt(),
    createReviewPiePrompt(),
    createReviewDividendsPrompt(),
  ]
}
