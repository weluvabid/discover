import type { DatabaseSync } from 'node:sqlite';
import {
  DEFAULT_RANKING_CONFIGURATION,
  rankForContext,
  type RankingConfiguration,
  type RankingContext,
} from '@/features/discovery/engine/ranking';
import { EXPERIENCE_GENRES } from '@/types/experience';
import { seedPersonas } from '../ingestion/synthetic';
import { getCatalog, getCatalogCount, getExperience } from '../ranking/catalog';

const CONTEXTS = new Set<RankingContext>([
  'featured',
  'trending',
  'recommended',
  'hidden-gems',
  'recently-launched',
]);
const SIGNAL_IDS = ['affinity', 'quality', 'relevance', 'freshness', 'popularity', 'diversity'];

type ApiResult = {
  status: number;
  body: unknown;
};

type DiscoverInput = {
  strategy?: string;
  signals?: RankingConfiguration['signals'];
  genre?: string;
  persona?: string;
  limit?: number;
};

export async function handleApiRequest(
  db: DatabaseSync,
  method: string,
  url: URL,
  body?: unknown,
): Promise<ApiResult> {
  if (method === 'GET' && url.pathname === '/api/health') {
    return {
      status: 200,
      body: { status: 'ok', catalogCount: getCatalogCount(db) },
    };
  }

  if (method === 'GET' && url.pathname === '/api/experiences') {
    const limit = Number(url.searchParams.get('limit') ?? 100);
    const offset = Number(url.searchParams.get('offset') ?? 0);

    if (
      !Number.isInteger(limit) ||
      !Number.isInteger(offset) ||
      limit < 1 ||
      limit > 500 ||
      offset < 0
    ) {
      return { status: 400, body: { error: 'Invalid pagination.' } };
    }

    return {
      status: 200,
      body: {
        data: getCatalog(db, {
          limit,
          offset,
          query: url.searchParams.get('q') ?? undefined,
          genre: url.searchParams.get('genre') ?? undefined,
        }),
        total: getCatalogCount(db),
        limit,
        offset,
      },
    };
  }

  const detail = url.pathname.match(/^\/api\/experiences\/(\d+)$/);
  const universeId = detail?.[1];

  if (method === 'GET' && universeId) {
    const experience = getExperience(db, universeId);

    return experience
      ? { status: 200, body: experience }
      : { status: 404, body: { error: 'Experience not found.' } };
  }

  if (method === 'GET' && url.pathname === '/api/search') {
    const query = url.searchParams.get('q')?.trim();

    return {
      status: 200,
      body: {
        data: query
          ? getCatalog(db, { query, genre: url.searchParams.get('genre') ?? undefined, limit: 100 })
          : [],
      },
    };
  }

  if (method === 'GET' && url.pathname === '/api/personas') {
    const personas = seedPersonas().map(({ id, label, description, preferences }) => ({
      id,
      label,
      description,
      preferences,
    }));

    return { status: 200, body: { data: personas } };
  }

  const discover = url.pathname.match(/^\/api\/discover\/([a-z-]+)$/);

  if (method === 'POST' && discover) {
    const context = (discover[1] ?? '') as RankingContext;

    if (!CONTEXTS.has(context)) {
      return { status: 404, body: { error: 'Unknown discovery context.' } };
    }

    const input = (body && typeof body === 'object' ? body : {}) as DiscoverInput;
    const limit = input.limit ?? 40;

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return { status: 400, body: { error: 'limit must be an integer from 1 to 100.' } };
    }

    const genre =
      input.genre === 'All' || EXPERIENCE_GENRES.includes(input.genre as never)
        ? input.genre
        : undefined;
    const persona = seedPersonas().some((item) => item.id === input.persona)
      ? input.persona
      : undefined;
    const catalog = getCatalog(db, { limit: 10_000, genre, persona });
    const strategy = ['balanced', 'popularity', 'personalized', 'discovery'].includes(
      input.strategy ?? '',
    )
      ? input.strategy
      : DEFAULT_RANKING_CONFIGURATION.strategy;
    const validSignals =
      Array.isArray(input.signals) &&
      input.signals.length === 6 &&
      input.signals.every(
        (signal) =>
          signal &&
          SIGNAL_IDS.includes(signal.id) &&
          typeof signal.label === 'string' &&
          typeof signal.description === 'string' &&
          Number.isFinite(signal.weight) &&
          typeof signal.enabled === 'boolean',
      ) &&
      new Set(input.signals.map((signal) => signal.id)).size === 6;
    const configuration: RankingConfiguration = {
      strategy: strategy as RankingConfiguration['strategy'],
      signals:
        validSignals && input.signals ? input.signals : DEFAULT_RANKING_CONFIGURATION.signals,
    };
    const results = rankForContext(catalog, configuration, context, {
      limit,
      genre: genre as never,
    });

    return {
      status: 200,
      body: {
        context,
        persona: persona ?? null,
        totalCandidates: catalog.length,
        results,
      },
    };
  }

  return { status: 404, body: { error: 'Not found.' } };
}
