import type {
  CallToolResult,
  GetPromptResult,
  Prompt,
  Tool,
} from "@modelcontextprotocol/sdk/types.js"

import type { Account } from "../domain/account.js"
import type { Position } from "../domain/position.js"
import type { Pie, PieDetails } from "../domain/pie.js"
import type { Transaction } from "../domain/transaction.js"
import type { Dividend } from "../domain/dividend.js"
import type { Page, PageOpts } from "../domain/pagination.js"

export interface ToolBinding {
  readonly tool: Tool
  readonly handler: (args: unknown) => Promise<CallToolResult>
}

export interface PromptBinding {
  readonly prompt: Prompt
  readonly handler: (args: Readonly<Record<string, string>> | undefined) => Promise<GetPromptResult>
}

export interface BrokerCapabilities {
  readonly pies: boolean
  readonly dividends: boolean
  readonly transactions: boolean
}

export interface BrokerConfig {
  readonly credentials: Readonly<Record<string, string>>
}

export interface IBroker {
  readonly id: string
  readonly name: string
  readonly capabilities: BrokerCapabilities

  authenticate(config: BrokerConfig): Promise<void>
  getAccount(): Promise<Account>
  getPositions(): Promise<readonly Position[]>
  getTransactions(opts: PageOpts): Promise<Page<Transaction>>
  getDividends(opts: PageOpts): Promise<Page<Dividend>>

  getPies?(): Promise<readonly Pie[]>
  getPie?(id: string): Promise<PieDetails>
}
