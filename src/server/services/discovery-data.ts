import type { Experience } from '../../types/experience';
import type { RankingContext } from '../../features/discovery/engine/ranking';
import { CACHE_TTL_MS, DISCOVERY_LIMITS } from '../../config/discovery';
import { TtlCache } from '../cache/ttl-cache';
import type { RoTunnelClient } from '../providers/rotunnel/index';
import { RoTunnelError, selectSortForContext } from '../providers/rotunnel/index';
import { enrichCandidates } from './experience-enrichment';
import { PERSONA_SEARCH_QUERIES, type PersonaId } from '../../domain/personas/personas';
import { omniSearchCandidates } from './omni-search-cache';

const cache = new TtlCache(DISCOVERY_LIMITS.cacheEntries);

export const cached = <T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> =>
  cache.getOrLoad(key, ttlMs, load);

export async function candidatesForContext(
  client: RoTunnelClient,
  context: RankingContext,
  personaId?: string,
): Promise<Experience[]> {
  const sorts = await cached('rotunnel:sorts', CACHE_TTL_MS.providerSorts, () => client.getSorts());
  const selectedSort = selectSortForContext(sorts, context);

  if (!selectedSort) {
    throw new RoTunnelError(
      `RoTunnel does not currently expose a discovery sort suitable for ${context}.`,
      502,
      '/explore-api/v1/get-sorts',
    );
  }

  const candidates = await cached(
    `rotunnel:sort:${selectedSort.id}`,
    CACHE_TTL_MS.sortContent,
    () => client.getSortContent(selectedSort.id),
  );

  if (candidates.length === 0) {
    throw new RoTunnelError(
      `RoTunnel returned no recognizable candidates for sort ${selectedSort.id}.`,
      502,
      '/explore-api/v1/get-sort-content',
    );
  }

  const nativeExperiences = await cached(
    `rotunnel:experiences:${selectedSort.id}`,
    CACHE_TTL_MS.enrichedCandidates,
    () => enrichCandidates(client, candidates.slice(0, DISCOVERY_LIMITS.candidates)),
  );
  const validPersona =
    personaId && personaId in PERSONA_SEARCH_QUERIES ? (personaId as PersonaId) : undefined;

  if (!validPersona) return nativeExperiences;

  return cached(
    `rotunnel:persona-context:v1:${context}:${selectedSort.id}:${validPersona}`,
    CACHE_TTL_MS.enrichedCandidates,
    async () => {
      const sessionId = globalThis.crypto.randomUUID();
      const targetedCandidates = (
        await Promise.all(
          PERSONA_SEARCH_QUERIES[validPersona].map((query) =>
            omniSearchCandidates(client, query, sessionId, 2),
          ),
        )
      ).flat();
      const seen = new Set(nativeExperiences.map((experience) => experience.id));
      const uniqueTargeted = targetedCandidates.filter((candidate) => {
        if (seen.has(candidate.universeId)) return false;

        seen.add(candidate.universeId);

        return true;
      });
      const targetedExperiences = uniqueTargeted.length
        ? await enrichCandidates(client, uniqueTargeted.slice(0, DISCOVERY_LIMITS.candidates))
        : [];

      return [...nativeExperiences, ...targetedExperiences];
    },
  );
}

export async function searchExperiences(
  client: RoTunnelClient,
  query: string,
): Promise<Experience[]> {
  const normalizedQuery = query.toLowerCase();
  const candidates = await cached(
    `rotunnel:search:${normalizedQuery}`,
    CACHE_TTL_MS.searchResults,
    () => client.search(query),
  );

  return cached(`rotunnel:search-experiences:${normalizedQuery}`, CACHE_TTL_MS.searchResults, () =>
    enrichCandidates(client, candidates.slice(0, DISCOVERY_LIMITS.candidates)),
  );
}
