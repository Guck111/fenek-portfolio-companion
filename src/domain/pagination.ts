export interface PageOpts {
  readonly limit?: number
  readonly cursor?: string
}

export interface Page<T> {
  readonly items: readonly T[]
  readonly hasMore: boolean
  readonly nextCursor?: string
}
