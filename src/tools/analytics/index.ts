import type { ToolBinding } from "../../brokers/base.js"

import { createPortfolioConcentrationTool } from "./portfolio_concentration.js"
import { createPortfolioDividendHistoryTool } from "./portfolio_dividend_history.js"
import { createPortfolioOverviewTool } from "./portfolio_overview.js"
import { createPortfolioPieOverlapTool } from "./portfolio_pie_overlap.js"

export function createAnalyticsTools(): readonly ToolBinding[] {
  return [
    createPortfolioOverviewTool(),
    createPortfolioConcentrationTool(),
    createPortfolioPieOverlapTool(),
    createPortfolioDividendHistoryTool(),
  ]
}
