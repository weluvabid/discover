import { CACHE_TTL_MS, DISCOVERY_LIMITS } from '../../config/discovery';
import type { RoTunnelClient } from '../providers/rotunnel/index';
import type { JsonObject } from '../providers/rotunnel/types';
import { TtlCache } from '../cache/ttl-cache';

const cache = new TtlCache(DISCOVERY_LIMITS.cacheEntries * 2);

function batchKey(kind: string, ids: readonly string[]): string {
  return `${kind}:${[...ids].sort().join(',')}`;
}

export function detailsForIds(
  client: RoTunnelClient,
  ids: readonly string[],
): Promise<Map<string, JsonObject>> {
  if (ids.length === 0) {
    return Promise.resolve(new Map());
  }
  return cache.getOrLoad(batchKey('details', ids), CACHE_TTL_MS.experienceDetails, () =>
    client.getDetails([...ids]),
  );
}

export function votesForIds(
  client: RoTunnelClient,
  ids: readonly string[],
): Promise<Map<string, JsonObject>> {
  if (ids.length === 0) {
    return Promise.resolve(new Map());
  }
  return cache.getOrLoad(batchKey('votes', ids), CACHE_TTL_MS.experienceVotes, () =>
    client.getVotes([...ids]),
  );
}

export function iconsForIds(
  client: RoTunnelClient,
  ids: readonly string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) {
    return Promise.resolve(new Map());
  }
  return cache.getOrLoad(batchKey('icons', ids), CACHE_TTL_MS.experienceIcons, () =>
    client.getIcons([...ids]),
  );
}

export function clearProviderResponseCache(): void {
  cache.clear();
}
