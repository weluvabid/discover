type CacheEntry<T> = { expiresAt: number; value: T };

/** A bounded, process-local TTL cache with LRU eviction and request coalescing. */
export class TtlCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private generation = 0;
  private readonly maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;

    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
      throw new RangeError('maxEntries must be a positive safe integer.');
    }
  }

  get size(): number {
    return this.entries.size;
  }

  async getOrLoad<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new RangeError('ttlMs must be a positive finite number.');
    }

    const now = Date.now();
    const existing = this.entries.get(key) as CacheEntry<T> | undefined;

    if (existing && existing.expiresAt > now) {
      // Map insertion order is the LRU order; refresh the hit.
      this.entries.delete(key);
      this.entries.set(key, existing);

      return existing.value;
    }

    if (existing) this.entries.delete(key);

    const pending = this.inFlight.get(key) as Promise<T> | undefined;

    if (pending) return pending;

    const generation = this.generation;
    const task = Promise.resolve()
      .then(load)
      .then((value) => {
        if (generation === this.generation) {
          this.entries.delete(key);
          this.entries.set(key, { expiresAt: Date.now() + ttlMs, value });
          this.evictExpiredAndOverflow(Date.now());
        }

        return value;
      });

    this.inFlight.set(key, task);

    try {
      return await task;
    } finally {
      if (this.inFlight.get(key) === task) this.inFlight.delete(key);
    }
  }


  clear(): void {
    this.entries.clear();
    // Existing callers still receive their in-flight result, but the generation
    // guard prevents work started before clear() from repopulating the cache.
    this.generation += 1;
    this.inFlight.clear();
  }

  private evictExpiredAndOverflow(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }

    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;

      if (oldest === undefined) break;

      this.entries.delete(oldest);
    }
  }
}
