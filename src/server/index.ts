import { createServer } from 'node:http';
import { handleApiRequest } from './api/app';
import { openDatabase } from './db/database';

const db = openDatabase();
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

    const result = await handleApiRequest(db, request.method ?? 'GET', url, body);

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

server.listen(port, host, () => {
  process.stdout.write(`Discover API listening on http://${host}:${port}\n`);
});

const shutdown = () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
