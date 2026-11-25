import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJson } from './transport';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('RoTunnel transport', () => {
  it('returns parsed JSON for successful responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchJson<{ ok: boolean }>(new URL('https://example.test/data'))).resolves.toEqual(
      {
        ok: true,
      },
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
  });

  it('retries a transient upstream server error once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ recovered: true }));

    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    const pending = fetchJson<{ recovered: boolean }>(new URL('https://example.test/data'));

    await vi.advanceTimersByTimeAsync(250);

    await expect(pending).resolves.toEqual({ recovered: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries an internal request timeout once', async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(
      AbortSignal.abort(new DOMException('Timed out', 'TimeoutError')),
    );
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'))
      .mockResolvedValueOnce(Response.json({ recovered: true }));

    vi.stubGlobal('fetch', fetchMock);
    const pending = fetchJson<{ recovered: boolean }>(new URL('https://example.test/timeout'));

    await vi.advanceTimersByTimeAsync(250);

    await expect(pending).resolves.toEqual({ recovered: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry when the caller aborts during the request', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(
      (_url: URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), {
            once: true,
          });
        }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const pending = fetchJson(new URL('https://example.test/cancel'), controller.signal);

    await Promise.resolve();
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caps concurrent upstream requests at eight', async () => {
    let active = 0;
    let maximumActive = 0;
    const resolvers: Array<(response: Response) => void> = [];
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          active += 1;
          maximumActive = Math.max(maximumActive, active);
          resolvers.push((response) => {
            active -= 1;
            resolve(response);
          });
        }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const requests = Array.from({ length: 12 }, (_, index) =>
      fetchJson<{ index: number }>(new URL(`https://example.test/${index}`)),
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(maximumActive).toBe(8);

    while (resolvers.length > 0 || active > 0) {
      const batch = resolvers.splice(0);

      for (const resolve of batch) resolve(Response.json({ index: 1 }));

      await Promise.resolve();
      await Promise.resolve();
    }

    await expect(Promise.all(requests)).resolves.toHaveLength(12);
    expect(maximumActive).toBeLessThanOrEqual(8);
  });

  it('does not retry non-retryable client errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchJson(new URL('https://example.test/missing'))).rejects.toMatchObject({
      name: 'RoTunnelError',
      status: 404,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('wraps malformed JSON as an upstream error without retrying', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('{', { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchJson(new URL('https://example.test/data'))).rejects.toMatchObject({
      name: 'RoTunnelError',
      status: 502,
      retryable: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('propagates caller cancellation without retrying', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    vi.stubGlobal('fetch', fetchMock);
    controller.abort();

    await expect(
      fetchJson(new URL('https://example.test/data'), controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
