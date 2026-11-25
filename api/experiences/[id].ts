// Reuse the shared API boundary for nested experience-detail requests.
import { handleLiveRequest } from '../../dist-server/live-app.mjs';

export default {
  fetch(request: Request): Promise<Response> {
    return handleLiveRequest(request);
  },
};
