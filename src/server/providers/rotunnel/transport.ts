import { RoTunnelError } from './types';

const REQUEST_TIMEOUT_MS = 5_000;
const MAX_RETRIES = 1;
const MAX_CONCURRENT_REQUESTS = 8;
const MAX_QUEUED_REQUESTS = 64;
const RETRY_DELAY_MS = 250;

let activeRequests = 0;
const waiters: Array<{
  resolve: (release: () => void) => void;
  reject: (error: unknown) => void;
  signal?: AbortSignal;
  onAbort?: () => void;
}> = [];

function acquireRequestSlot(signal?: AbortSignal): Promise<() => void> {
  if (signal?.aborted) return Promise.reject(signal.reason);

  return new Promise((resolve, reject) => {
    const grant = () => {
      activeRequests += 1;
      let released = false;

      resolve(() => {
        if (released) return;

        released = true;
        activeRequests -= 1;
        drainWaiters();
      });
    };

    if (activeRequests < MAX_CONCURRENT_REQUESTS && waiters.length === 0) {
      grant();

      return;
    }

    if (waiters.length >= MAX_QUEUED_REQUESTS) {
      reject(
        new RoTunnelError(
          'RoTunnel request capacity is temporarily exhausted.',
          503,
          '/request-capacity',
        ),
      );

      return;
    }

    const waiter = {
      resolve,
      reject,
      signal,
      onAbort: undefined as (() => void) | undefined,
    };

    waiter.onAbort = () => {
      const index = waiters.indexOf(waiter);

      if (index >= 0) waiters.splice(index, 1);

      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', waiter.onAbort, { once: true });
    waiters.push(waiter);
  });
}

function drainWaiters(): void {
  while (activeRequests < MAX_CONCURRENT_REQUESTS && waiters.length > 0) {
    const waiter = waiters.shift();

    if (!waiter) return;

    waiter.signal?.removeEventListener('abort', waiter.onAbort!);

    if (waiter.signal?.aborted) {
      waiter.reject(waiter.signal.reason);
      continue;
    }

    activeRequests += 1;
    let released = false;

    waiter.resolve(() => {
      if (released) return;

      released = true;
      activeRequests -= 1;
      drainWaiters();
    });
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function fetchJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (signal?.aborted) throw signal.reason;

    const release = await acquireRequestSlot(signal);

    try {
      const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
      const response = await fetch(url, {
        signal: requestSignal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        const retryAfter = Number(response.headers.get('retry-after'));

        await response.body?.cancel();

        if (retryable && attempt < MAX_RETRIES) {
          const retryDelay = Number.isFinite(retryAfter)
            ? Math.min(750, Math.max(0, retryAfter * 1000))
            : RETRY_DELAY_MS;

          lastError = new RoTunnelError(
            `RoTunnel returned HTTP ${response.status}.`,
            response.status,
            url.pathname,
          );
          release();
          await delay(retryDelay, signal);
          continue;
        }

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

      if (signal?.aborted) throw signal.reason;

      if (error instanceof RoTunnelError && !error.retryable) throw error;

      if (error instanceof RoTunnelError && error.status < 500 && error.status !== 429) throw error;

      const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
      const retryableTransportError =
        !(error instanceof RoTunnelError) &&
        !(error instanceof DOMException && error.name === 'AbortError');

      if (attempt < MAX_RETRIES && (timedOut || retryableTransportError)) {
        await delay(RETRY_DELAY_MS, signal);
        continue;
      }

      break;
    } finally {
      release();
    }
  }

  if (signal?.aborted) throw signal.reason;

  if (lastError instanceof RoTunnelError) throw lastError;

  throw new RoTunnelError(
    'Unable to reach RoTunnel.',
    502,
    url.pathname,
    lastError instanceof Error ? { cause: lastError } : undefined,
  );
}
