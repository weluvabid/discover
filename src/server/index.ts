import { createServer } from 'node:http';
import { handleApiRequest } from './api/app';
import { openDatabase } from './db/database';
import { hydrateFromTurso } from './turso-sync';
import { RankingWorkerPool } from './ranking/worker-pool';

const db = openDatabase();
const workerCount = Number(process.env.RANKING_WORKERS ?? 4);
const rankingPool =
  workerCount > 0
    ? new RankingWorkerPool(workerCount, Number(process.env.RANKING_QUEUE_CAPACITY ?? 128))
    : undefined;
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '127.0.0.1';

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') ?? [];

  response.setHeader('Vary', 'Origin');

  if (origin && allowedOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();

    return;
  }

  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    let body: unknown;

    if (request.method === 'POST') {
      let raw = '';

      for await (const chunk of request) {
        raw += chunk.toString();

        if (raw.length > 64 * 1024) {
          throw new Error('Request body exceeds 64 KiB.');
        }
      }

      body = raw ? JSON.parse(raw) : {};
    }

    const result = await handleApiRequest(
      db,
      request.method ?? 'GET',
      url,
      body,
      rankingPool?.rank,
    );

    response.writeHead(result.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(JSON.stringify(result.body));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('64 KiB') ? 413 : message.includes('JSON') ? 400 : 500;

    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: message }));
  }
});

const shutdown = () => {
  server.close(() => {
    void (async () => {
      await rankingPool?.close();
      db.close();
      process.exit(0);
    })();
  });
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

const start = async () => {
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    const result = await hydrateFromTurso(db);

    process.stdout.write(`Hydrated API read model from Turso: ${JSON.stringify(result)}\n`);
  }

  server.listen(port, host, () => {
    process.stdout.write(`Discover API listening on http://${host}:${port}\n`);
  });
};

start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error';

  process.stderr.write(`Discover API startup failed: ${message}\n`);
  db.close();
  process.exitCode = 1;
});
