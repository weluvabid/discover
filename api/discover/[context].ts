// The API handler is bundled by `pnpm api:build` before Vercel packages this function.
import { handleLiveRequest } from '../../dist-server/live-app.mjs';

/**
 * Same-origin Vercel API catch-all.
 *
 * The handler and its local dependencies are bundled into a Node-compatible
 * ESM artifact. This avoids relying on Vite's extensionless TypeScript import
 * resolution inside the deployed Node.js runtime.
 */
export default {
  fetch(request: Request): Promise<Response> {
    return handleLiveRequest(request);
  },
};
