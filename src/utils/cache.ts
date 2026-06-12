interface Entry<V> {
  readonly value: V
  readonly expiresAt: number
}

export class TTLCache<K, V> {
  private readonly store = new Map<K, Entry<V>>()
  private readonly defaultTtlMs: number
  private readonly maxEntries: number

  // Entries expire lazily (on get), so without a size bound a stream of
  // never-re-read keys would grow the map forever. FIFO eviction is enough:
  // these caches hold provider lookups, not hot working sets.
  constructor(defaultTtlMs: number, maxEntries = 1000) {
    if (defaultTtlMs <= 0) {
      throw new Error("TTL must be positive")
    }
    if (maxEntries <= 0) {
      throw new Error("maxEntries must be positive")
    }
    this.defaultTtlMs = defaultTtlMs
    this.maxEntries = maxEntries
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key)
    if (entry === undefined) return undefined
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: K, value: V, ttlMs?: number): void {
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next()
      if (!oldest.done) this.store.delete(oldest.value)
    }
    const ttl = ttlMs ?? this.defaultTtlMs
    this.store.set(key, { value, expiresAt: Date.now() + ttl })
  }

  delete(key: K): boolean {
    return this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }
}
