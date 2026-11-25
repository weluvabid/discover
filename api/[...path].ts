import { handleLiveRequest } from '../src/server/api/live-app';

/**
 * Same-origin Vercel API catch-all.
 *
 * Keep the HTTP contract in handleLiveRequest so local Node development and
 * Vercel production execute exactly the same route, validation, CORS and
 * error-handling code.
 */
export default {
  fetch(request: Request): Promise<Response> {
    return handleLiveRequest(request);
  },
};
