import { API_ORIGIN, GAMES_ORIGIN, THUMBNAILS_ORIGIN } from './urls';
import { extractCandidates, extractSorts, isRecord, stringValue } from './response-parsers';
import { fetchJson } from './transport';
import type { JsonObject, NativeCandidate, NativeSort } from './types';

const BATCH_SIZE = 50;

function sessionId(): string {
  return globalThis.crypto.randomUUID();
}

async function fetchBatchedMap<T>(
  universeIds: string[],
  createUrl: (batch: string[]) => URL,
  readEntry: (item: JsonObject) => readonly [string, T] | undefined,
  signal?: AbortSignal,
): Promise<Map<string, T>> {
  const batches: string[][] = [];

  for (let offset = 0; offset < universeIds.length; offset += BATCH_SIZE) {
    batches.push(universeIds.slice(offset, offset + BATCH_SIZE));
  }

  // A feed is capped at 100 candidates, so this fan-out is bounded to two
  // requests per endpoint. Promise.all preserves batch order in the merge.
  const payloads = await Promise.all(
    batches.map((batch) => fetchJson<unknown>(createUrl(batch), signal)),
  );
  const results = new Map<string, T>();

  for (const payload of payloads) {
    const items = isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];

    for (const item of items) {
      if (!isRecord(item)) continue;

      const entry = readEntry(item);

      if (entry) results.set(entry[0], entry[1]);
    }
  }

  return results;
}

export class RoTunnelClient {
  async getSorts(signal?: AbortSignal): Promise<NativeSort[]> {
    const url = new URL('/explore-api/v1/get-sorts', API_ORIGIN);

    url.search = new URLSearchParams({
      sessionId: sessionId(),
      device: 'computer',
      country: 'all',
    }).toString();

    return extractSorts(await fetchJson<unknown>(url, signal));
  }

  async getSortContent(sortId: string, signal?: AbortSignal): Promise<NativeCandidate[]> {
    const url = new URL('/explore-api/v1/get-sort-content', API_ORIGIN);

    url.search = new URLSearchParams({
      sessionId: sessionId(),
      sortId,
      device: 'computer',
      country: 'all',
      maxRows: '100',
    }).toString();

    return extractCandidates(await fetchJson<unknown>(url, signal), sortId);
  }

  async search(
    query: string,
    signal?: AbortSignal,
    sharedSessionId?: string,
    maxPages = 3,
  ): Promise<NativeCandidate[]> {
    const url = new URL('/search-api/omni-search', API_ORIGIN);
    const session = sharedSessionId ?? sessionId();
    const candidates = new Map<string, NativeCandidate>();
    let pageToken: string | undefined;

    // Search exposes a continuation token. Keep pagination explicitly bounded so
    // one query cannot consume unbounded request time or upstream quota.
    const pageLimit = Number.isSafeInteger(maxPages) ? Math.min(3, Math.max(1, maxPages)) : 3;

    for (let page = 0; page < pageLimit; page += 1) {
      const params = new URLSearchParams({
        searchQuery: query,
        sessionId: session,
        pageType: 'games',
      });

      if (pageToken) params.set('pageToken', pageToken);

      url.search = params.toString();

      const payload = await fetchJson<unknown>(url, signal);
      const pageCandidates = extractCandidates(payload, 'omni-search');

      for (const candidate of pageCandidates) {
        if (candidates.has(candidate.universeId)) continue;

        candidates.set(candidate.universeId, {
          ...candidate,
          nativePosition: candidates.size + 1,
        });
      }

      pageToken = isRecord(payload)
        ? stringValue(payload.nextPageToken, payload.nextPageCursor)
        : undefined;

      if (!pageToken) break;
    }

    return [...candidates.values()];
  }

  async getDetails(universeIds: string[], signal?: AbortSignal): Promise<Map<string, JsonObject>> {
    return fetchBatchedMap(
      universeIds,
      (batch) => {
        const url = new URL('/v1/games', GAMES_ORIGIN);

        url.searchParams.set('universeIds', batch.join(','));

        return url;
      },
      (item) => {
        const id = stringValue(item.id, item.universeId);

        return id ? [id, item] : undefined;
      },
      signal,
    );
  }

  async getVotes(universeIds: string[], signal?: AbortSignal): Promise<Map<string, JsonObject>> {
    return fetchBatchedMap(
      universeIds,
      (batch) => {
        const url = new URL('/v1/games/votes', GAMES_ORIGIN);

        url.searchParams.set('universeIds', batch.join(','));

        return url;
      },
      (item) => {
        const id = stringValue(item.id, item.universeId);

        return id ? [id, item] : undefined;
      },
      signal,
    );
  }

  async getIcons(universeIds: string[], signal?: AbortSignal): Promise<Map<string, string>> {
    return fetchBatchedMap(
      universeIds,
      (batch) => {
        const url = new URL('/v1/games/icons', THUMBNAILS_ORIGIN);

        url.search = new URLSearchParams({
          universeIds: batch.join(','),
          size: '512x512',
          format: 'Png',
          isCircular: 'false',
        }).toString();

        return url;
      },
      (item) => {
        const id = stringValue(item.targetId, item.universeId);
        const imageUrl = stringValue(item.imageUrl);

        return id && imageUrl && item.state !== 'Blocked' ? [id, imageUrl] : undefined;
      },
      signal,
    );
  }
}
