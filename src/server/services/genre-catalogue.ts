import { CACHE_TTL_MS, DISCOVERY_LIMITS } from '../../config/discovery';
import { EXPERIENCE_GENRES, type ExperienceGenre } from '../../types/experience';
import { PERSONA_SEARCH_QUERIES, type PersonaId } from '../../domain/personas/personas';
import { normalizeExperience, RoTunnelError } from '../providers/rotunnel/index';
import type { NativeCandidate, NativeSort, RoTunnelClient } from '../providers/rotunnel/index';
import type { JsonObject } from '../providers/rotunnel/types';
import { TtlCache } from '../cache/ttl-cache';
import { clearOmniSearchCache, omniSearchCandidates } from './omni-search-cache';

const cache = new TtlCache(8);
const feedCache = new TtlCache(DISCOVERY_LIMITS.cacheEntries);
const MAX_CATALOGUE_CANDIDATES = 600;
const MAX_NATIVE_FEED_CANDIDATES = 300;
const CATEGORY_SEARCH_QUERIES: Readonly<Record<ExperienceGenre, readonly string[]>> = {
  'Action RPG': ['RPG'],
  Exploration: ['Adventure'],
  'Co-op': ['Survival'],
  Racing: ['Racing'],
  Horror: ['Horror'],
  Simulation: ['Simulator'],
  Puzzle: ['Puzzle'],
};

const MAX_SEARCH_CONCURRENCY = 4;
const CATEGORY_SEARCH_MAX_PAGES = 2;

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(values.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (nextIndex < values.length) {
        const index = nextIndex++;
        const value = values[index];

        if (value === undefined) continue;

        try {
          results[index] = { status: 'fulfilled', value: await mapper(value) };
        } catch (reason) {
          results[index] = { status: 'rejected', reason };
        }
      }
    },
  );

  await Promise.all(workers);

  return results;
}

const SORT_GROUPS: readonly RegExp[] = [
  /top[\s._-]*trending|trending/i,
  /top[\s._-]*(?:playing|popular)|popular|most[\s._-]*played/i,
  /up[\s._-]*and[\s._-]*coming|emerging|undiscovered/i,
  /new[\s._-]*experiences|newly[\s._-]*launched|recently[\s._-]*launched/i,
  /recently[\s._-]*updated|updated/i,
  /survival|co.?op|team[\s._-]*play/i,
  /racing|driving|motorsport|vehicles?/i,
  /adventure|exploration|open[\s._-]*world/i,
  /simulator|simulation|sandbox/i,
  /top[\s._-]*rated|highest[\s._-]*rated/i,
  /most[\s._-]*favorited|top[\s._-]*favorites?/i,
  /most[\s._-]*visited|top[\s._-]*visits/i,
];

function sortIdentity(sort: NativeSort): string {
  return `${sort.id} ${sort.name} ${sort.description}`;
}

export function selectGenreCatalogueSorts(sorts: NativeSort[]): NativeSort[] {
  const selected: NativeSort[] = [];
  const selectedIds = new Set<string>();

  for (const pattern of SORT_GROUPS) {
    const match = sorts.find(
      (sort) => !selectedIds.has(sort.id) && pattern.test(sortIdentity(sort)),
    );

    if (match) {
      selected.push(match);
      selectedIds.add(match.id);
    }

    if (selected.length >= DISCOVERY_LIMITS.genreCatalogueSorts) break;
  }

  // Provider sort names change occasionally. Preserve catalogue availability
  // by filling remaining slots with other distinct native feeds in provider order.
  for (const sort of sorts) {
    if (selected.length >= DISCOVERY_LIMITS.genreCatalogueSorts) break;

    if (selectedIds.has(sort.id)) continue;

    selected.push(sort);
    selectedIds.add(sort.id);
  }

  return selected;
}

export interface GenreCatalogue {
  total: number;
  byGenre: Record<ExperienceGenre, NativeCandidate[]>;
  details: Map<string, JsonObject>;
  diagnostics: {
    feedCandidateCounts: Record<string, number>;
    failedFeeds: string[];
    failedSearches: string[];
    searchQueries: number;
    uniqueCandidates: number;
    lowConfidence: number;
    unknown: number;
    detailLookupCandidates: number;
  };
}

async function loadGenreCatalogue(
  client: RoTunnelClient,
  personaId?: PersonaId,
): Promise<GenreCatalogue> {
  const categoryQueries = EXPERIENCE_GENRES.flatMap((genre) =>
    CATEGORY_SEARCH_QUERIES[genre].map((query) => ({ genre, query, kind: 'category' as const })),
  );
  const personaQueries = personaId
    ? PERSONA_SEARCH_QUERIES[personaId].map((query) => ({
        query,
        kind: 'persona' as const,
      }))
    : [];
  // Persona intent gets first claim on the Omni Search budget; broad category
  // searches fill remaining capacity afterwards.
  const queries = [...personaQueries, ...categoryQueries];
  const sharedSessionId = globalThis.crypto.randomUUID();
  const [sortsResult, searchResults] = await Promise.all([
    client.getSorts().then(
      (sorts) => ({ sorts: selectGenreCatalogueSorts(sorts) }),
      (error: unknown) => ({ error }),
    ),
    mapWithConcurrency(queries, MAX_SEARCH_CONCURRENCY, ({ query }) =>
      omniSearchCandidates(client, query, sharedSessionId, CATEGORY_SEARCH_MAX_PAGES),
    ),
  ]);
  const sorts = 'sorts' in sortsResult ? sortsResult.sorts : [];
  const feedResults = await Promise.allSettled(
    sorts.map(async (sort) => ({
      sort,
      candidates: await feedCache.getOrLoad(
        `rotunnel:genre-sort:${sort.id}`,
        CACHE_TTL_MS.sortContent,
        () => client.getSortContent(sort.id),
      ),
    })),
  );
  const unique = new Map<string, NativeCandidate>();
  const feedCandidateCounts: Record<string, number> = {};
  const failedFeeds: string[] = 'error' in sortsResult ? ['sort-catalogue'] : [];

  // Reserve half the catalogue budget for targeted Omni Search candidates so
  // broad native feeds cannot crowd out category-specific acquisition.
  for (const [index, result] of feedResults.entries()) {
    if (result.status !== 'fulfilled') {
      failedFeeds.push(sorts[index]?.id ?? 'unknown');
      continue;
    }

    feedCandidateCounts[result.value.sort.id] = result.value.candidates.length;

    for (const candidate of result.value.candidates) {
      if (unique.has(candidate.universeId)) continue;

      if (unique.size >= MAX_NATIVE_FEED_CANDIDATES) break;

      unique.set(candidate.universeId, candidate);
    }
  }

  const failedSearches: string[] = [];

  for (const [index, result] of searchResults.entries()) {
    if (result.status !== 'fulfilled') {
      failedSearches.push(
        `${queries[index]?.kind ?? 'category'}:${queries[index]?.query ?? 'unknown'}`,
      );
      continue;
    }

    for (const candidate of result.value) {
      if (unique.has(candidate.universeId)) continue;
      if (unique.size >= MAX_CATALOGUE_CANDIDATES) break;

      unique.set(candidate.universeId, {
        ...candidate,
        sourceSortId: `omni-search:${queries[index]?.kind ?? 'category'}:${queries[index]?.query ?? 'unknown'}`,
      });
    }
  }

  if (unique.size === 0) {
    const firstFeedFailure = feedResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    const firstSearchFailure = searchResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    if ('error' in sortsResult) throw sortsResult.error;
    if (firstFeedFailure) throw firstFeedFailure.reason;
    if (firstSearchFailure) throw firstSearchFailure.reason;
  }

  const byGenre = Object.fromEntries(
    EXPERIENCE_GENRES.map((genre) => [genre, [] as NativeCandidate[]]),
  ) as Record<ExperienceGenre, NativeCandidate[]>;
  const details = new Map<string, JsonObject>();
  const pendingDetails: NativeCandidate[] = [];
  let lowConfidence = 0;
  let unknown = 0;

  // Classify feed metadata first. Only candidates that lack a confident result
  // need the more expensive game-details lookup.
  for (const candidate of unique.values()) {
    const normalized = normalizeExperience(candidate, candidate.raw, undefined, undefined);

    if (normalized.genreConfidence === 'high' || normalized.genreConfidence === 'medium') {
      byGenre[normalized.genre].push(candidate);
    } else {
      pendingDetails.push(candidate);
    }
  }

  const pendingIds = pendingDetails.map(({ universeId }) => universeId);
  const fetchedDetails = pendingIds.length
    ? await client.getDetails(pendingIds).catch(() => new Map<string, JsonObject>())
    : new Map<string, JsonObject>();

  for (const candidate of pendingDetails) {
    const detail = fetchedDetails.get(candidate.universeId);

    if (detail) details.set(candidate.universeId, detail);

    const normalized = normalizeExperience(
      candidate,
      detail ?? candidate.raw,
      undefined,
      undefined,
    );

    if (normalized.genreConfidence === 'high' || normalized.genreConfidence === 'medium') {
      byGenre[normalized.genre].push(candidate);
    } else if (normalized.genreConfidence === 'low') {
      lowConfidence += 1;
    } else {
      unknown += 1;
    }
  }

  return {
    total: unique.size,
    byGenre,
    details,
    diagnostics: {
      feedCandidateCounts,
      failedFeeds,
      failedSearches,
      searchQueries: queries.length,
      uniqueCandidates: unique.size,
      lowConfidence,
      unknown,
      detailLookupCandidates: pendingIds.length,
    },
  };
}

export function clearGenreCatalogueCache(): void {
  cache.clear();
  feedCache.clear();
  clearOmniSearchCache();
}

export function genreCatalogueFor(
  client: RoTunnelClient,
  personaId?: string,
): Promise<GenreCatalogue> {
  const validPersona =
    personaId && personaId in PERSONA_SEARCH_QUERIES ? (personaId as PersonaId) : undefined;
  const catalogueKey = `rotunnel:genre-catalogue:v4:${validPersona ?? 'default'}`;

  return cache.getOrLoad(catalogueKey, CACHE_TTL_MS.genreCatalogue, () =>
    loadGenreCatalogue(client, validPersona),
  );
}

export async function genreCataloguePage(
  client: RoTunnelClient,
  genre: ExperienceGenre | 'All',
  offset: number,
  limit: number,
  personaId?: string,
): Promise<{ candidates: NativeCandidate[]; total: number; details: Map<string, JsonObject> }> {
  const catalogue = await genreCatalogueFor(client, personaId);
  const candidates =
    genre === 'All'
      ? [...EXPERIENCE_GENRES.flatMap((item) => catalogue.byGenre[item])]
      : catalogue.byGenre[genre];

  // Enrichment is intentionally performed only for the requested page, not the
  // entire multi-feed catalogue. This bounds upstream metadata fan-out.
  const page = candidates.slice(offset, offset + Math.min(limit, DISCOVERY_LIMITS.pageSize));

  const pageDetails = new Map(
    page.flatMap((candidate) => {
      const detail = catalogue.details.get(candidate.universeId);

      return detail ? [[candidate.universeId, detail] as const] : [];
    }),
  );

  return { candidates: page, total: candidates.length, details: pageDetails };
}

export function genreCatalogueCounts(
  catalogue: GenreCatalogue,
): Record<ExperienceGenre | 'All', number> {
  return {
    All: EXPERIENCE_GENRES.reduce((total, genre) => total + catalogue.byGenre[genre].length, 0),
    ...Object.fromEntries(
      EXPERIENCE_GENRES.map((genre) => [genre, catalogue.byGenre[genre].length]),
    ),
  } as Record<ExperienceGenre | 'All', number>;
}
