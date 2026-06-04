import type { ToolBinding } from "../../brokers/base.js"

import { createAnalyzeConcentrationPlaybook } from "./analyze_concentration.js"
import { createAnalyzeOverviewPlaybook } from "./analyze_overview.js"
import { createReviewDividendsPlaybook } from "./review_dividends.js"
import { createReviewPiePlaybook } from "./review_pie.js"

export function createPlaybookTools(): readonly ToolBinding[] {
  return [
    createAnalyzeOverviewPlaybook(),
    createAnalyzeConcentrationPlaybook(),
    createReviewPiePlaybook(),
    createReviewDividendsPlaybook(),
  ]
}
