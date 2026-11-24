import { CACHE_TTL_MS, DISCOVERY_LIMITS } from '../../config/discovery';
import { EXPERIENCE_GENRES, type ExperienceGenre } from '../../types/experience';
import { normalizeExperience, RoTunnelError } from '../providers/rotunnel/index';
import type { NativeCandidate, NativeSort, RoTunnelClient } from '../providers/rotunnel/index';
import type { JsonObject } from '../providers/rotunnel/types';
import { TtlCache } from '../cache/ttl-cache';

const cache = new TtlCache(8);
const feedCache = new TtlCache(DISCOVERY_LIMITS.cacheEntries);

const SORT_GROUPS: readonly RegExp[] = [
  /top[\s._-]*trending|trending/i,
  /top[\s._-]*(?:playing|popular)|popular|most[\s._-]*played/i,
  /up[\s._-]*and[\s._-]*coming|emerging|undiscovered/i,
  /new[\s._-]*experiences|newly[\s._-]*launched|recently[\s._-]*launched/i,
  /recently[\s._-]*updated|updated/i,
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
}

async function loadGenreCatalogue(client: RoTunnelClient): Promise<GenreCatalogue> {
  const sorts = selectGenreCatalogueSorts(await client.getSorts());

  if (sorts.length === 0) {
    throw new RoTunnelError(
      'RoTunnel returned no native feeds for the genre catalogue.',
      502,
      '/explore-api/v1/get-sorts',
    );
  }

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

  for (const result of feedResults) {
    if (result.status !== 'fulfilled') continue;

    for (const candidate of result.value.candidates) {
      if (unique.has(candidate.universeId)) continue;

      unique.set(candidate.universeId, {
        ...candidate,
        nativePosition: unique.size + 1,
      });
    }
  }

  if (unique.size === 0) {
    const firstFailure = feedResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    if (firstFailure) throw firstFailure.reason;
  }

  const ids = [...unique.keys()];
  const details = await client.getDetails(ids).catch(() => new Map<string, JsonObject>());
  const byGenre = Object.fromEntries(
    EXPERIENCE_GENRES.map((genre) => [genre, [] as NativeCandidate[]]),
  ) as Record<ExperienceGenre, NativeCandidate[]>;

  for (const candidate of unique.values()) {
    const normalized = normalizeExperience(
      candidate,
      details.get(candidate.universeId) ?? candidate.raw,
      undefined,
      undefined,
    );

    // Genre navigation must be trustworthy. Low-confidence and unknown guesses
    // remain available in the general feed, but do not inflate genre coverage.
    if (normalized.genreConfidence !== 'high' && normalized.genreConfidence !== 'medium') {
      continue;
    }

    byGenre[normalized.genre].push(candidate);
  }

  return { total: unique.size, byGenre, details };
}

export function clearGenreCatalogueCache(): void {
  cache.clear();
  feedCache.clear();
}

export function genreCatalogueFor(client: RoTunnelClient): Promise<GenreCatalogue> {
  return cache.getOrLoad('rotunnel:genre-catalogue:v1', CACHE_TTL_MS.genreCatalogue, () =>
    loadGenreCatalogue(client),
  );
}

export async function genreCataloguePage(
  client: RoTunnelClient,
  genre: ExperienceGenre | 'All',
  offset: number,
  limit: number,
): Promise<{ candidates: NativeCandidate[]; total: number; details: Map<string, JsonObject> }> {
  const catalogue = await genreCatalogueFor(client);
  const candidates =
    genre === 'All'
      ? [...EXPERIENCE_GENRES.flatMap((item) => catalogue.byGenre[item])]
      : catalogue.byGenre[genre];

  // Enrichment is intentionally performed only for the requested page, not the
  // entire multi-feed catalogue. This bounds upstream metadata fan-out.
  const page = candidates.slice(offset, offset + Math.min(limit, DISCOVERY_LIMITS.pageSize));

  return { candidates: page, total: candidates.length, details: catalogue.details };
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
