import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { openDatabaseReadOnly } from '../src/server/db/database';
import { handleApiRequest } from '../src/server/api/app';
import { RankingWorkerPool } from '../src/server/ranking/worker-pool';

const databasePath = resolve(process.env.DATABASE_PATH ?? 'data/roblox-games.db');

if (!existsSync(databasePath)) {
  throw new Error(`Local catalog not found at ${databasePath}. Set DATABASE_PATH to the SQLite file.`);
}

const db = openDatabaseReadOnly(databasePath);
const workerCount = Number(process.env.RANKING_WORKERS ?? 0);
const rankingPool = workerCount > 0 ? new RankingWorkerPool(workerCount, Number(process.env.RANKING_QUEUE_CAPACITY ?? 128)) : undefined;
const host = '127.0.0.1';
const contexts = ['featured', 'trending', 'recommended', 'hidden-gems', 'recently-launched'];
const samples = Number(process.env.BENCHMARK_SAMPLES ?? 60);
const warmups = Number(process.env.BENCHMARK_WARMUPS ?? 10);
const concurrencyLevels = (process.env.BENCHMARK_CONCURRENCY ?? '1,5,10,25')
  .split(',')
  .map(Number)
  .filter((value) => Number.isInteger(value) && value > 0 && value <= 1000);

const eventLoop = monitorEventLoopDelay({ resolution: 10 });
const stageByRequest = new Map<string, StageTimings>();
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? host}`);
    let body: unknown;

    if (request.method === 'POST') {
      let raw = '';

      for await (const chunk of request) {
        raw += chunk.toString();

        if (raw.length > 64 * 1024) throw new Error('Request body exceeds 64 KiB.');
      }

      body = raw ? JSON.parse(raw) : {};
    }

    const requestId = request.headers['x-benchmark-id'];
    const requestStages = typeof requestId === 'string' ? stageByRequest.get(requestId) : undefined;
    const result = await handleApiRequest(db, request.method ?? 'GET', url, body, rankingPool?.rank, (stage, duration) => { if (requestStages) requestStages[stage] = duration; });
    const payload = JSON.stringify(result.body);

    response.writeHead(result.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    response.writeHead(500, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: message }));
  }
});

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);

  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] ?? 0;
}

function summarize(values: number[], elapsed: number) {
  return {
    requests: values.length,
    medianMs: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    p99Ms: percentile(values, 0.99),
    maxMs: Math.max(...values),
    throughputRps: values.length / (elapsed / 1000),
  };
}

type StageTimings = { catalog?: number; ranking?: number };

async function request(path: string, method = 'GET', body?: unknown, stages?: StageTimings) {
  const start = performance.now();
  const requestId = stages ? `${Math.random()}-${performance.now()}` : undefined;

  if (requestId && stages) stageByRequest.set(requestId, stages);

  const response = await fetch(`http://${host}:${port}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(requestId ? { 'x-benchmark-id': requestId } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  const duration = performance.now() - start;

  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status} ${JSON.stringify(payload)}`);

  if (requestId) stageByRequest.delete(requestId);

  return { duration, payload };
}

let port = 0;

try {
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, host, () => {
      port = (server.address() as { port: number }).port;
      resolveListen();
    });
  });

  const health = await request('/api/health');
  const catalogCount = health.payload.catalogCount as number;

  if (!Number.isInteger(catalogCount) || catalogCount <= 0) {
    throw new Error(`Local valid catalog is empty (catalogCount=${catalogCount}).`);
  }

  eventLoop.enable();
  const cpuStart = process.cpuUsage();
  const memoryStart = process.memoryUsage();

  process.stdout.write(`Local SQLite API benchmark\nDatabase: ${databasePath}\nEligible catalog: ${catalogCount}\nRanking workers: ${workerCount}\nSamples/context: ${samples}; warmups: ${warmups}\n`);

  process.stdout.write('\nDiscovery request latency (HTTP + SQLite + ranking + JSON)\n');

  for (const context of contexts) {
    const path = `/api/discover/${context}`;

    for (let i = 0; i < warmups; i += 1) await request(path, 'POST', { limit: 40, persona: 'builder' });

    const durations: number[] = [];
    const started = performance.now();

    for (let i = 0; i < samples; i += 1) {
      const result = await request(path, 'POST', { limit: 40, persona: 'builder' });

      durations.push(result.duration);
    }

    const elapsed = performance.now() - started;
    const stats = summarize(durations, elapsed);

    process.stdout.write(`${context.padEnd(19)} median ${stats.medianMs.toFixed(2)} ms · p95 ${stats.p95Ms.toFixed(2)} ms · p99 ${stats.p99Ms.toFixed(2)} ms · ${stats.throughputRps.toFixed(1)} req/s\n`);
  }

  process.stdout.write('\nConcurrent recommended discovery (HTTP + SQLite + ranking + JSON)\n');

  for (const concurrency of concurrencyLevels) {
    const total = Math.max(concurrency, samples);
    const durations: number[] = [];
    const catalogStages: number[] = [];
    const rankingStages: number[] = [];
    const started = performance.now();

    for (let offset = 0; offset < total; offset += concurrency) {
      const batch = Array.from({ length: Math.min(concurrency, total - offset) }, async () => {
        const stages: StageTimings = {};
        const result = await request('/api/discover/recommended', 'POST', { limit: 40, persona: 'builder' }, stages);

        durations.push(result.duration);

        if (stages.catalog !== undefined) catalogStages.push(stages.catalog);

        if (stages.ranking !== undefined) rankingStages.push(stages.ranking);
      });

      await Promise.all(batch);
    }

    const elapsed = performance.now() - started;
    const stats = summarize(durations, elapsed);
    const stageStats = `catalog p50 ${percentile(catalogStages, 0.5).toFixed(2)} ms · ranking p50 ${percentile(rankingStages, 0.5).toFixed(2)} ms`;
    const pool = rankingPool?.getStats();

    process.stdout.write(`${String(concurrency).padStart(3)} concurrent  p50 ${stats.medianMs.toFixed(2)} ms · p95 ${stats.p95Ms.toFixed(2)} ms · p99 ${stats.p99Ms.toFixed(2)} ms · ${stats.throughputRps.toFixed(1)} req/s · ${stageStats} · workers ${pool?.workers ?? 0} · avg queue ${pool?.avgQueueWaitMs?.toFixed(2) ?? '0.00'} ms · avg worker ${pool?.avgExecutionMs?.toFixed(2) ?? '0.00'} ms · queued ${pool?.queued ?? 0}\n`);
  }

  const detailRow = db.prepare("SELECT universe_id FROM games WHERE source_status = 'valid' ORDER BY universe_id LIMIT 1").get() as { universe_id: string } | undefined;

  if (!detailRow) throw new Error('No valid catalog record available for detail benchmark.');

  eventLoop.disable();
  const cpu = process.cpuUsage(cpuStart);
  const memoryEnd = process.memoryUsage();
  const loop = { mean: Number.isFinite(eventLoop.mean) ? eventLoop.mean / 1e6 : 0, p95: eventLoop.percentile(95) / 1e6, max: eventLoop.max / 1e6 };

  process.stdout.write(`\nRuntime diagnostics\nCPU user ${(cpu.user / 1000).toFixed(1)} ms · system ${(cpu.system / 1000).toFixed(1)} ms\nRSS ${(memoryStart.rss / 1048576).toFixed(1)} → ${(memoryEnd.rss / 1048576).toFixed(1)} MiB · heap ${(memoryStart.heapUsed / 1048576).toFixed(1)} → ${(memoryEnd.heapUsed / 1048576).toFixed(1)} MiB\nEvent-loop delay mean ${loop.mean.toFixed(2)} ms · p95 ${loop.p95.toFixed(2)} ms · max ${loop.max.toFixed(2)} ms\nWorker pool ${JSON.stringify(rankingPool?.getStats() ?? { workers: 0 })}\n`);

  process.stdout.write('\nSupporting endpoint latency\n');

  for (const [label, path] of [
    ['health', '/api/health'],
    ['catalog page', '/api/experiences?limit=100&offset=0'],
    ['search', '/api/search?q=simulator'],
    ['detail', `/api/experiences/${detailRow.universe_id}`],
  ]) {
    const durations: number[] = [];
    let ok = 0;

    for (let i = 0; i < samples; i += 1) {
      const result = await request(path);

      durations.push(result.duration);
      ok += 1;
    }

    const stats = summarize(durations, durations.reduce((a, b) => a + b, 0));

    process.stdout.write(`${label.padEnd(15)} p50 ${stats.medianMs.toFixed(2)} ms · p95 ${stats.p95Ms.toFixed(2)} ms · requests ${ok}\n`);
  }
} finally {
  await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  await rankingPool?.close();
  db.close();
}
