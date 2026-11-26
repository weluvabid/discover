import { CACHE_TTL_MS, DISCOVERY_LIMITS } from '../../config/discovery';
import type { NativeCandidate, RoTunnelClient } from '../providers/rotunnel/index';
import { TtlCache } from '../cache/ttl-cache';

const cache = new TtlCache(DISCOVERY_LIMITS.cacheEntries);

/** Shared query-level cache so catalogue and discovery requests reuse the same provider response. */
export function omniSearchCandidates(
  client: RoTunnelClient,
  query: string,
  sessionId: string,
  maxPages: number,
): Promise<NativeCandidate[]> {
  const normalizedQuery = query.trim().toLowerCase();

  return cache.getOrLoad(
    `rotunnel:omni-search:${normalizedQuery}`,
    CACHE_TTL_MS.searchResults,
    () => client.search(query, undefined, sessionId, maxPages),
  );
}

export function clearOmniSearchCache(): void {
  cache.clear();
}
