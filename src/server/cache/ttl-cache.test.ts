import { describe, expect, it, vi } from 'vitest';
import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  it('coalesces concurrent loads and caches the result', async () => {
    const cache = new TtlCache(4);
    let loads = 0;
    const load = async () => {
      loads += 1;

      return { value: 42 };
    };
    const [a, b] = await Promise.all([
      cache.getOrLoad('key', 1_000, load),
      cache.getOrLoad('key', 1_000, load),
    ]);

    expect(a).toEqual({ value: 42 });
    expect(b).toBe(a);
    expect(loads).toBe(1);
  });

  it('evicts the least recently used entry when full', async () => {
    const cache = new TtlCache(2);
    const load = (value: number) => async () => value;

    await cache.getOrLoad('a', 1_000, load(1));
    await cache.getOrLoad('b', 1_000, load(2));
    await cache.getOrLoad('a', 1_000, load(3)); // a becomes most recently used
    await cache.getOrLoad('c', 1_000, load(4));
    let bLoads = 0;

    expect(
      await cache.getOrLoad('b', 1_000, async () => {
        bLoads += 1;

        return 5;
      }),
    ).toBe(5);
    expect(bLoads).toBe(1);
    expect(cache.size).toBe(2);
  });

  it('does not cache rejected loads', async () => {
    const cache = new TtlCache(2);

    await expect(
      cache.getOrLoad('bad', 1_000, async () => {
        throw new Error('failure');
      }),
    ).rejects.toThrow('failure');
    await expect(cache.getOrLoad('bad', 1_000, async () => 'recovered')).resolves.toBe('recovered');
  });

  it('does not repopulate the cache when an in-flight load resolves after clear', async () => {
    const cache = new TtlCache(2);
    let resolveLoad!: (value: string) => void;
    const pending = cache.getOrLoad(
      'key',
      1_000,
      () =>
        new Promise<string>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    await Promise.resolve();
    cache.clear();
    resolveLoad('stale');

    await expect(pending).resolves.toBe('stale');
    expect(cache.size).toBe(0);
    await expect(cache.getOrLoad('key', 1_000, async () => 'fresh')).resolves.toBe('fresh');
  });

  it('does not let an older in-flight request overwrite a newer load after clear', async () => {
    const cache = new TtlCache(2);
    let resolveOld!: (value: string) => void;
    const oldRequest = cache.getOrLoad(
      'key',
      1_000,
      () =>
        new Promise<string>((resolve) => {
          resolveOld = resolve;
        }),
    );

    await Promise.resolve();
    cache.clear();
    await expect(cache.getOrLoad('key', 1_000, async () => 'new')).resolves.toBe('new');
    resolveOld('old');
    await expect(oldRequest).resolves.toBe('old');
    await expect(cache.getOrLoad('key', 1_000, async () => 'unexpected')).resolves.toBe('new');
  });

  it('expires entries', async () => {
    vi.useFakeTimers();

    try {
      const cache = new TtlCache(2);

      await cache.getOrLoad('key', 10, async () => 1);
      vi.advanceTimersByTime(11);
      await expect(cache.getOrLoad('key', 10, async () => 2)).resolves.toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
