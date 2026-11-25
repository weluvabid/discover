import { describe, expect, it } from 'vitest';
import { awaitWithSignal } from './abortable';

describe('awaitWithSignal', () => {
  it('stops the caller waiting without cancelling shared work', async () => {
    const controller = new AbortController();
    let resolveShared!: (value: string) => void;
    const shared = new Promise<string>((resolve) => {
      resolveShared = resolve;
    });

    const waiting = awaitWithSignal(shared, controller.signal);
    controller.abort(new DOMException('Aborted', 'AbortError'));

    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
    resolveShared('still available to other callers');
    await expect(shared).resolves.toBe('still available to other callers');
  });

  it('does not attach work when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new DOMException('Aborted', 'AbortError'));

    await expect(awaitWithSignal(Promise.resolve('value'), controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
