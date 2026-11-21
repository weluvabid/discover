import type { DiscoveryPersona, Experience } from '@/types/experience';
import type {
  RankedExperience,
  RankingConfiguration,
  RankingContext,
} from '@/features/discovery/engine/ranking';

export interface DiscoverApiError extends Error {
  status?: number;
}

export type SearchSort = 'relevance' | 'players' | 'rating' | 'reviews' | 'launched' | 'updated';

export type GenreCounts = Record<'All' | 'Action RPG' | 'Exploration' | 'Co-op' | 'Racing' | 'Horror' | 'Simulation' | 'Puzzle', number>;

export interface DiscoverPageResult {
  context: RankingContext;
  persona: string | null;
  totalCandidates: number;
  results: RankedExperience[];
}

const configuredBase = import.meta.env.PUBLIC_DISCOVER_API_URL?.trim();
const API_BASE = (configuredBase || (import.meta.env.DEV ? 'http://127.0.0.1:8787/api' : '/api')).replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    const headers = new Headers(init?.headers);

    headers.set('Accept', 'application/json');
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (cause) {
    const error = new Error('Unable to reach the Discover API. Check your connection and try again.') as DiscoverApiError;

    error.cause = cause;
    throw error;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
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
  return request<DiscoverPageResult>(`/discover/${context}`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      strategy: configuration.strategy,
      signals: configuration.signals,
      genre,
      limit,
      persona,
    }),
  });
}

export async function searchCatalog(
  query: string,
  genre: string,
  sort: SearchSort = 'relevance',
  signal?: AbortSignal,
): Promise<Experience[]> {
  const params = new URLSearchParams({ q: query, sort });

  if (genre !== 'All') params.set('genre', genre);

  const result = await request<{ data: Experience[] }>(`/search?${params}`, { signal });

  return result.data;
}

export function fetchExperience(id: string, signal?: AbortSignal): Promise<Experience> {
  return request<Experience>(`/experiences/${encodeURIComponent(id)}`, { signal });
}

export function fetchCatalog(
  limit = 100,
  signal?: AbortSignal,
): Promise<{ data: Experience[]; total: number; limit: number; offset: number }> {
  return request<{ data: Experience[]; total: number; limit: number; offset: number }>(
    `/experiences?limit=${limit}`,
    { signal },
  );
}

export function fetchPersonas(signal?: AbortSignal): Promise<{ data: DiscoveryPersona[] }> {
  return request<{ data: DiscoveryPersona[] }>('/personas', { signal });
}

export function fetchGenreCounts(signal?: AbortSignal): Promise<{ data: GenreCounts }> {
  return request<{ data: GenreCounts }>('/genres', { signal });
}
