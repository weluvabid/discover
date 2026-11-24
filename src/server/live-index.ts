import { createServer } from 'node:http';
import { handleLiveRequest } from './api/live-app';
import { DISCOVERY_LIMITS } from '../config/discovery';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '127.0.0.1';
const maxBodyBytes = DISCOVERY_LIMITS.requestBodyBytes;

const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks: Buffer[] = [];
    let size = 0;

    for await (const chunk of incoming) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

      size += buffer.byteLength;

      if (size > maxBodyBytes) {
        outgoing.writeHead(413, { 'Content-Type': 'application/json' });
        outgoing.end(JSON.stringify({ error: 'Request body exceeds 64 KiB.' }));

        return;
      }

      chunks.push(buffer);
    }

    const method = incoming.method ?? 'GET';
    const headers = new Headers();

    for (const [key, value] of Object.entries(incoming.headers)) {
      if (Array.isArray(value)) headers.set(key, value.join(', '));
      else if (value !== undefined) headers.set(key, value);
    }

    const request = new Request(
      new URL(incoming.url ?? '/', `http://${incoming.headers.host ?? 'localhost'}`),
      {
        method,
        headers,
        ...(method === 'GET' || method === 'HEAD' ? {} : { body: Buffer.concat(chunks) }),
      },
    );
    const response = await handleLiveRequest(request);
    const body = Buffer.from(await response.arrayBuffer());
    const responseHeaders = Object.fromEntries(response.headers.entries());

    outgoing.writeHead(response.status, responseHeaders);
    outgoing.end(body);
  } catch (error) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);

    process.stderr.write(`Discover API request failed: ${message}\n`);
    outgoing.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    outgoing.end(JSON.stringify({ error: 'Internal server error.' }));
  }
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;

server.listen(port, host, () => {
  process.stdout.write(`Discover live API listening on http://${host}:${port}\n`);
});

const shutdown = () => {
  server.close();
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
