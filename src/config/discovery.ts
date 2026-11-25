import type {
  RankingConfiguration,
  RankingContext,
  RankingSignalId,
  RankingStrategyId,
} from '../features/discovery/engine/ranking';
import { EXPERIENCE_GENRES, type ExperienceGenre } from '../types/experience';

export const DISCOVERY_CONTEXTS = [
  'featured',
  'trending',
  'recommended',
  'hidden-gems',
  'recently-launched',
] as const satisfies readonly RankingContext[];

export const DISCOVERY_STRATEGIES = {
  balanced: { label: 'Balanced', description: 'Even distribution' },
  popularity: { label: 'Popularity-first', description: 'Trending and active players' },
  personalized: {
    label: 'Personalized',
    description: 'Player affinity focus',
  },
  discovery: {
    label: 'Discovery-first',
    description: 'Hidden gems and novelty',
  },
} as const satisfies Record<RankingStrategyId, { label: string; description: string }>;

export const DISCOVERY_STRATEGY_LABELS: Record<RankingStrategyId, string> = {
  balanced: DISCOVERY_STRATEGIES.balanced.label,
  popularity: DISCOVERY_STRATEGIES.popularity.label,
  personalized: DISCOVERY_STRATEGIES.personalized.label,
  discovery: DISCOVERY_STRATEGIES.discovery.label,
};

export const DISCOVERY_CONTEXT_LABELS: Record<RankingContext, string> = {
  featured: 'Featured',
  trending: 'Trending',
  recommended: 'Recommended',
  'hidden-gems': 'Hidden Gems',
  'recently-launched': 'Recently Launched',
};

export const SEARCH_SORT_LABELS = {
  relevance: 'Relevance',
  players: 'Most players',
  rating: 'Highest rated',
  reviews: 'Most votes',
  launched: 'Recently launched',
  updated: 'Recently updated',
} as const;
export type SearchSort = keyof typeof SEARCH_SORT_LABELS;

export function isSearchSort(value: unknown): value is SearchSort {
  return typeof value === 'string' && Object.hasOwn(SEARCH_SORT_LABELS, value);
}

export const DISCOVERY_SIGNAL_IDS = [
  'affinity',
  'quality',
  'relevance',
  'freshness',
  'popularity',
  'diversity',
] as const satisfies readonly RankingSignalId[];

export const DISCOVERY_LIMITS = {
  requestBodyBytes: 64 * 1024,
  cacheEntries: 256,
  candidates: 100,
  resultLimit: 100,
  searchQueryCharacters: 200,
  pageSize: 500,
  genreCatalogueSorts: 12,
} as const;

export const CACHE_TTL_MS = {
  // Prototype data changes slowly; cache acquisition results aggressively.
  providerSorts: 24 * 60 * 60_000,
  sortContent: 24 * 60 * 60_000,
  enrichedCandidates: 24 * 60 * 60_000,
  searchResults: 12 * 60 * 60_000,
  experienceDetails: 24 * 60 * 60_000,
  experienceVotes: 24 * 60 * 60_000,
  experienceIcons: 24 * 60 * 60_000,
  genreCatalogue: 24 * 60 * 60_000,
} as const;

export const EXPERIENCE_GENRE_OPTIONS = ['All', ...EXPERIENCE_GENRES] as const;
export type ExperienceGenreFilter = ExperienceGenre | 'All';

export function isRankingContext(value: string): value is RankingContext {
  return (DISCOVERY_CONTEXTS as readonly string[]).includes(value);
}

export function isRankingStrategy(value: unknown): value is RankingStrategyId {
  return typeof value === 'string' && Object.hasOwn(DISCOVERY_STRATEGIES, value);
}

export function isExperienceGenre(value: unknown): value is ExperienceGenreFilter {
  return (
    typeof value === 'string' && (EXPERIENCE_GENRE_OPTIONS as readonly string[]).includes(value)
  );
}

export function isRankingSignalId(value: unknown): value is RankingSignalId {
  return typeof value === 'string' && (DISCOVERY_SIGNAL_IDS as readonly string[]).includes(value);
}

export type RankingSignalPreference = Pick<
  RankingConfiguration['signals'][number],
  'id' | 'weight' | 'enabled'
>[];

export function isRankingConfiguration(value: unknown): value is RankingSignalPreference {
  if (!Array.isArray(value) || value.length !== DISCOVERY_SIGNAL_IDS.length) return false;

  const ids = new Set<string>();

  return value.every((signal: unknown) => {
    if (!signal || typeof signal !== 'object' || Array.isArray(signal)) return false;

    const candidate = signal as Record<string, unknown>;

    if (
      !isRankingSignalId(candidate.id) ||
      ids.has(candidate.id) ||
      typeof candidate.weight !== 'number' ||
      !Number.isFinite(candidate.weight) ||
      candidate.weight < 0 ||
      candidate.weight > 100 ||
      typeof candidate.enabled !== 'boolean'
    ) {
      return false;
    }

    ids.add(candidate.id);

    return true;
  });
}
