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
    const resolvers: Array<() => void> = [];
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          active += 1;
          maximumActive = Math.max(maximumActive, active);
          resolvers.push(() => {
            active -= 1;
            resolve(Response.json({ ok: true }));
          });
        }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const requests = Array.from({ length: 12 }, (_, index) =>
      fetchJson<{ ok: boolean }>(new URL(`https://example.test/${index}`)),
    );

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(8));
    expect(maximumActive).toBe(8);

    resolvers.splice(0).forEach((resolve) => resolve());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(12));

    resolvers.splice(0).forEach((resolve) => resolve());

    await expect(Promise.all(requests)).resolves.toHaveLength(12);
    expect(maximumActive).toBeLessThanOrEqual(8);
    expect(active).toBe(0);
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

  it('does not start a request when the caller is already aborted', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    vi.stubGlobal('fetch', fetchMock);
    controller.abort();

    await expect(
      fetchJson(new URL('https://example.test/data'), controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
