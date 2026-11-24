import { RoTunnelError } from './types';

const REQUEST_TIMEOUT_MS = 5_000;
const MAX_RETRIES = 1;

export async function fetchJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

    try {
      const response = await fetch(url, {
        signal: requestSignal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        const retryAfter = Number(response.headers.get('retry-after'));

        if (retryable && attempt < MAX_RETRIES) {
          const delay = Number.isFinite(retryAfter)
            ? Math.min(750, Math.max(0, retryAfter * 1000))
            : 250;

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        await response.body?.cancel();
        throw new RoTunnelError(
          `RoTunnel returned HTTP ${response.status}.`,
          response.status,
          url.pathname,
        );
      }

      try {
        return (await response.json()) as T;
      } catch (cause) {
        throw new RoTunnelError(
          'RoTunnel returned invalid JSON.',
          502,
          url.pathname,
          { cause },
          false,
        );
      }
    } catch (error) {
      lastError = error;

      if (signal?.aborted) throw error;

      if (error instanceof RoTunnelError && !error.retryable) throw error;

      if (error instanceof RoTunnelError && error.status < 500 && error.status !== 429) throw error;

      if (
        error instanceof DOMException &&
        (error.name === 'TimeoutError' || error.name === 'AbortError')
      ) {
        break;
      }

      if (attempt >= MAX_RETRIES) break;
    }
  }

  if (lastError instanceof RoTunnelError) throw lastError;

  throw new RoTunnelError(
    'Unable to reach RoTunnel.',
    502,
    url.pathname,
    lastError instanceof Error ? { cause: lastError } : undefined,
  );
}
