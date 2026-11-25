import { RoTunnelClient, RoTunnelError } from '../providers/rotunnel/index';
import { jsonResponse } from './http/json-response';
import { handleGet } from './routes/get';
import { handlePost } from './routes/post';

function corsHeadersFor(request: Request): Headers {
  const origin = request.headers.get('origin');
  const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const headers = new Headers({ Vary: 'Origin' });

  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  return headers;
}

function withHeaders(response: Response, headers: Headers): Response {
  for (const [key, value] of headers) response.headers.set(key, value);

  return response;
}

function errorResponse(error: unknown, headers: Headers): Response {
  if (error instanceof RoTunnelError) {
    const status = error.status === 429 || error.status === 503 ? 503 : 502;

    return jsonResponse(
      {
        error: error.message,
        code: 'RO_TUNNEL_UPSTREAM_ERROR',
        upstreamStatus: error.status,
        endpoint: error.endpoint,
      },
      status,
      headers,
    );
  }

  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return jsonResponse({ error: 'Request was cancelled.' }, 408, headers);
  }

  return jsonResponse({ error: 'Internal server error.' }, 500, headers);
}

/** HTTP boundary: CORS, method dispatch and normalized error handling only. */
export async function handleLiveRequest(
  request: Request,
  client: RoTunnelClient = new RoTunnelClient(),
): Promise<Response> {
  const headers = corsHeadersFor(request);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const url = new URL(request.url);
    const response =
      request.method === 'GET'
        ? await handleGet(client, url, request.signal)
        : request.method === 'POST'
          ? await handlePost(client, url, request, request.signal)
          : jsonResponse({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST, OPTIONS' });

    return withHeaders(response, headers);
  } catch (error) {
    return errorResponse(error, headers);
  }
}
