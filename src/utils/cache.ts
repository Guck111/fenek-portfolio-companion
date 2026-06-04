interface Entry<V> {
  readonly value: V
  readonly expiresAt: number
}

export class TTLCache<K, V> {
  private readonly store = new Map<K, Entry<V>>()
  private readonly defaultTtlMs: number

  constructor(defaultTtlMs: number) {
    if (defaultTtlMs <= 0) {
      throw new Error("TTL must be positive")
    }
    this.defaultTtlMs = defaultTtlMs
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
