import { Worker } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import type { Experience } from '@/types/experience';
import type { RankingConfiguration, RankingContext, RankedExperience, RankingOptions } from '@/features/discovery/engine/ranking';

type Task = {
  id: number;
  catalog: Experience[];
  configuration: RankingConfiguration;
  context: RankingContext;
  options: { limit: number; genre?: Experience['genre'] | 'All' };
  resolve: (value: RankedExperience[]) => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
  startedAt?: number;
};

type Slot = { worker: Worker; task?: Task; generation: number };

export class RankingWorkerPool {
  private readonly slots: Array<Slot | undefined> = [];
  private readonly queue: Task[] = [];
  private nextId = 1;
  private closed = false;
  private pending = new Map<number, Task>();
  private completed = 0;
  private failed = 0;
  private totalQueueWaitMs = 0;
  private totalExecutionMs = 0;

  getStats() {
    return { workers: this.size, busy: this.slots.filter((slot) => slot?.task).length, queued: this.queue.length, pending: this.pending.size, completed: this.completed, failed: this.failed, avgQueueWaitMs: this.completed + this.failed ? this.totalQueueWaitMs / (this.completed + this.failed) : 0, avgExecutionMs: this.completed + this.failed ? this.totalExecutionMs / (this.completed + this.failed) : 0 };
  }

  constructor(
    private readonly size = 2,
    private readonly maxQueue = 128,
  ) {
    if (!Number.isInteger(size) || size < 1 || size > 32) throw new RangeError('Worker count must be 1–32.');

    if (!Number.isInteger(maxQueue) || maxQueue < 0) throw new RangeError('Queue capacity must be non-negative.');

    for (let i = 0; i < size; i += 1) this.spawn(i, 0);
  }

  rank = (
    catalog: Experience[],
    configuration: RankingConfiguration,
    context: RankingContext,
    options?: RankingOptions,
  ): Promise<RankedExperience[]> => {
    if (this.closed) return Promise.reject(new Error('Ranking worker pool is closed.'));

    if (this.queue.length >= this.maxQueue && this.slots.every((slot) => slot.task)) {
      return Promise.reject(Object.assign(new Error('Ranking capacity exhausted.'), { code: 'RANKING_OVERLOADED' }));
    }

    return new Promise((resolve, reject) => {
      const task: Task = {
        id: this.nextId++,
        catalog,
        configuration,
        context,
        options: { limit: options?.limit ?? 40, genre: options?.genre },
        resolve,
        reject,
        enqueuedAt: performance.now(),
      };

      this.pending.set(task.id, task);
      this.queue.push(task);
      this.dispatch();
    });
  };

  private spawn(index: number, generation: number) {
    // Vite emits the worker entry at dist-server/ranking-worker.mjs while this
    // pool is bundled under dist-server/assets/. Resolve from that emitted layout.
    const workerPath = fileURLToPath(new URL('../ranking-worker.mjs', import.meta.url));
    const worker = new Worker(workerPath);
    const slot: Slot = { worker, generation };

    this.slots[index] = slot;
    worker.on('message', (message: { id: number; result?: RankedExperience[]; error?: string }) => {
      const task = slot.task;

      if (!task || task.id !== message.id) return;

      slot.task = undefined;
      this.pending.delete(task.id);

      if (task.startedAt !== undefined) this.totalExecutionMs += performance.now() - task.startedAt;

      if (message.error) { this.failed += 1; task.reject(new Error(message.error)); }
      else { this.completed += 1; task.resolve(message.result ?? []); }

      this.dispatch();
    });
    worker.on('error', (error) => this.failSlot(index, slot, error));
    worker.on('exit', (code) => {
      if (!this.closed && this.slots[index] === slot) {
        this.failSlot(index, slot, new Error(`Ranking worker exited unexpectedly (${code}).`));
      }
    });
    this.dispatch();
  }

  private failSlot(index: number, slot: Slot, error: Error) {
    if (this.slots[index] !== slot) return;

    if (slot.task) {
      const task = slot.task;

      slot.task = undefined;
      this.pending.delete(task.id);

      if (task.startedAt !== undefined) this.totalExecutionMs += performance.now() - task.startedAt;

      this.failed += 1;
      task.reject(error);
    }

    this.slots[index] = undefined;

    if (!this.closed) this.spawn(index, slot.generation + 1);
  }

  private dispatch() {
    if (this.closed) return;

    for (const slot of this.slots) {
      if (!slot || slot.task) continue;

      const task = this.queue.shift();

      if (!task) break;

      slot.task = task;
      task.startedAt = performance.now();
      this.totalQueueWaitMs += task.startedAt - task.enqueuedAt;
      slot.worker.postMessage({
        id: task.id,
        catalog: task.catalog,
        configuration: task.configuration,
        context: task.context,
        options: task.options,
      });
    }
  }

  async close() {
    if (this.closed) return;

    this.closed = true;
    const error = new Error('Ranking worker pool shut down.');

    for (const task of this.queue.splice(0)) {
      this.pending.delete(task.id);
      this.failed += 1;
      task.reject(error);
    }

    for (const slot of this.slots) {
      if (slot?.task) {
        this.pending.delete(slot.task.id);
        slot.task.reject(error);
      }
    }

    await Promise.all(this.slots.filter(Boolean).map((slot) => slot.worker.terminate()));
  }
}
