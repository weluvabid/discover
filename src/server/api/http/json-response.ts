export function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);

  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');

  if (!responseHeaders.has('Cache-Control')) responseHeaders.set('Cache-Control', 'no-store');

  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}
