export type Locale = "en" | "ru"

export interface PromptMessages {
  readonly disclaimer: string
  readonly analyze_overview: {
    readonly description: string
    readonly text: string
  }
  readonly analyze_concentration: {
    readonly description: string
    readonly text: string
  }
  readonly review_pie: {
    readonly description: string
    readonly pie_id_arg_description: string
    readonly text: (pieId: string) => string
  }
  readonly review_dividends: {
    readonly description: string
    readonly year_arg_description: string
    readonly text_no_year: string
    readonly text_with_year: (year: string) => string
  }
}

export const ALL_LOCALES: readonly Locale[] = ["en", "ru"]
