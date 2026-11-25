import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('static discovery metadata cache', () => {
  it('deduplicates concurrent requests and reuses results across callers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const api = await import('./discover-api');

    const [personasA, personasB, genresA, genresB] = await Promise.all([
      api.fetchPersonas(),
      api.fetchPersonas(),
      api.fetchGenreCounts(),
      api.fetchGenreCounts(),
    ]);

    expect(personasA).toEqual(personasB);
    expect(genresA).toEqual(genresB);
    expect(api.getCachedPersonas()).toEqual([]);
    expect(api.getCachedGenreCounts()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await Promise.all([api.fetchPersonas(), api.fetchGenreCounts()]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('allows a failed metadata request to be retried', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    vi.stubGlobal('fetch', fetchMock);

    const api = await import('./discover-api');

    await expect(api.fetchPersonas()).rejects.toThrow('503');
    await expect(api.fetchPersonas()).resolves.toEqual({ data: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
