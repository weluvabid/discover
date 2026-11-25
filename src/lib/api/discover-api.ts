import type { DiscoveryPersona, Experience } from '@/types/experience';
import type { SearchSort as SearchSortType } from '@/config/discovery';
export type { SearchSort } from '@/config/discovery';
import type {
  RankedExperience,
  RankingConfiguration,
  RankingContext,
} from '@/features/discovery/engine/ranking';

export interface DiscoverApiError extends Error {
  status?: number;
}

export type GenreCounts = Record<
  'All' | 'Action RPG' | 'Exploration' | 'Co-op' | 'Racing' | 'Horror' | 'Simulation' | 'Puzzle',
  number
>;

export interface DiscoverPageResult {
  context: RankingContext;
  persona: string | null;
  totalCandidates: number;
  results: RankedExperience[];
}

const configuredBase = import.meta.env.PUBLIC_DISCOVER_API_URL?.trim();
const API_BASE = (
  configuredBase || (import.meta.env.DEV ? 'http://127.0.0.1:8787/api' : '/api')
).replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    const headers = new Headers(init?.headers);

    headers.set('Accept', 'application/json');
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (cause) {
    const error = new Error(
      'Unable to reach the Discover API. Check your connection and try again.',
    ) as DiscoverApiError;

    error.cause = cause;
    throw error;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : `Discover API request failed (${response.status}).`;
    const error = new Error(message) as DiscoverApiError;

    error.status = response.status;
    throw error;
  }

  return payload as T;
}

export function fetchDiscovery(
  context: RankingContext,
  configuration: RankingConfiguration,
  genre: string,
  signal?: AbortSignal,
  limit = context === 'featured' ? 1 : context === 'recommended' ? 7 : 8,
  persona?: string,
): Promise<DiscoverPageResult> {
  const params = new URLSearchParams({
    strategy: configuration.strategy,
    signals: JSON.stringify(
      configuration.signals.map(({ id, weight, enabled }) => ({ id, weight, enabled })),
    ),
    limit: String(limit),
  });

  if (genre !== 'All') {
    params.set('genre', genre);
  }

  if (persona) {
    params.set('persona', persona);
  }

  return request<DiscoverPageResult>(`/discover/${context}?${params}`, { signal });
}

export async function searchCatalog(
  query: string,
  genre: string,
  sort: SearchSortType = 'relevance',
  signal?: AbortSignal,
  persona?: string,
  configuration?: RankingConfiguration,
): Promise<RankedExperience[]> {
  const params = new URLSearchParams({ q: query, sort });

  if (genre !== 'All') {
    params.set('genre', genre);
  }

  if (persona) {
    params.set('persona', persona);
  }

  if (configuration) {
    params.set('strategy', configuration.strategy);
    params.set(
      'signals',
      JSON.stringify(
        configuration.signals.map(({ id, weight, enabled }) => ({ id, weight, enabled })),
      ),
    );
  }

  const result = await request<{ rankedData: RankedExperience[] }>(`/search?${params}`, { signal });

  return result.rankedData;
}

export function fetchExperience(id: string, signal?: AbortSignal): Promise<Experience> {
  return request<Experience>(`/experiences/${encodeURIComponent(id)}`, { signal });
}

export interface CatalogPageResult {
  data: Experience[];
  rankedData?: RankedExperience[];
  total: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
}

export function fetchCatalog(
  limit = 100,
  signal?: AbortSignal,
  genre: string = 'All',
  offset = 0,
  configuration?: RankingConfiguration,
  persona?: string,
): Promise<CatalogPageResult> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });

  // `genre=All` selects the ranked, paginated catalogue endpoint. Omitting it
  // falls back to the unranked trending feed.
  params.set('genre', genre);

  if (configuration) {
    params.set('strategy', configuration.strategy);
    params.set(
      'signals',
      JSON.stringify(
        configuration.signals.map(({ id, weight, enabled }) => ({ id, weight, enabled })),
      ),
    );
  }

  if (persona) {
    params.set('persona', persona);
  }

  return request<CatalogPageResult>(`/experiences?${params}`, { signal });
}

export function fetchPersonas(signal?: AbortSignal): Promise<{ data: DiscoveryPersona[] }> {
  return request<{ data: DiscoveryPersona[] }>('/personas', { signal });
}

export function fetchGenreCounts(signal?: AbortSignal): Promise<{ data: GenreCounts }> {
  return request<{ data: GenreCounts }>('/genres', { signal });
}
