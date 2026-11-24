import {
  DEFAULT_RANKING_CONFIGURATION,
  rankForContext,
  retrieveCandidates,
  type RankingConfiguration,
  type RankingContext,
  type RankingOptions,
} from '../../features/discovery/engine/ranking';
import { EXPERIENCE_GENRES, type Experience, type ExperienceGenre } from '../../types/experience';
import { seedPersonas } from '../../domain/personas/personas';
import { TtlCache } from '../cache/ttl-cache';
import { jsonResponse } from './http/json-response';
import {
  CACHE_TTL_MS,
  DISCOVERY_LIMITS,
  isExperienceGenre,
  isRankingConfiguration,
  isRankingContext,
  isRankingStrategy,
} from '../../config/discovery';
import {
  RoTunnelClient,
  RoTunnelError,
  candidateIds,
  normalizeExperience,
  selectSortForContext,
  type NativeCandidate,
} from './rotunnel';
import { applyPersona, enrichCandidates } from '../services/experience-enrichment';
import { sortSearchResults } from '../services/search-sorting';

const cache = new TtlCache(DISCOVERY_LIMITS.cacheEntries);

const cached = <T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> =>
  cache.getOrLoad(key, ttlMs, load);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function candidatesForContext(
  client: RoTunnelClient,
  context: RankingContext,
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

  return cached(`rotunnel:experiences:${selectedSort.id}`, CACHE_TTL_MS.enrichedCandidates, () =>
    enrichCandidates(client, candidates.slice(0, DISCOVERY_LIMITS.candidates)),
  );
}

async function searchExperiences(
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

async function handleGet(client: RoTunnelClient, url: URL): Promise<Response> {
  if (url.pathname === '/api/health') {
    return jsonResponse({ status: 'ok', provider: 'rotunnel' });
  }

  if (url.pathname === '/api/personas') {
    return jsonResponse({
      data: seedPersonas().map(({ id, label, description, preferences }) => ({
        id,
        label,
        description,
        preferences,
      })),
    });
  }

  if (url.pathname === '/api/genres') {
    const experiences = await candidatesForContext(client, 'trending');
    const counts: Record<ExperienceGenre | 'All', number> = {
      All: experiences.length,
      'Action RPG': 0,
      Exploration: 0,
      'Co-op': 0,
      Racing: 0,
      Horror: 0,
      Simulation: 0,
      Puzzle: 0,
    };

    for (const experience of experiences) counts[experience.genre] += 1;

    return jsonResponse({ data: counts });
  }

  if (url.pathname === '/api/search') {
    const query = url.searchParams.get('q')?.trim() ?? '';

    if (query.length > DISCOVERY_LIMITS.searchQueryCharacters) {
      return jsonResponse(
        { error: 'Search query must be 200 characters or fewer.' },
        400,
      );
    }
    if (!query) return jsonResponse({ data: [] });

    const requestedGenre = url.searchParams.get('genre');
    const genre = isExperienceGenre(requestedGenre) ? requestedGenre : undefined;
    const sort = url.searchParams.get('sort') ?? 'relevance';
    const experiences = await searchExperiences(client, query);
    const filtered =
      genre && genre !== 'All'
        ? experiences.filter(
            (experience) => experience.genre === genre || experience.tags.includes(genre),
          )
        : experiences;

    return jsonResponse({ data: sortSearchResults(filtered, sort) });
  }

  if (url.pathname === '/api/experiences') {
    const limit = Number(url.searchParams.get('limit') ?? 100);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const query = url.searchParams.get('q')?.trim();

    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > DISCOVERY_LIMITS.pageSize ||
      !Number.isSafeInteger(offset) ||
      offset < 0
    ) {
      return jsonResponse({ error: 'Invalid pagination.' }, 400);
    }

    if (query && query.length > DISCOVERY_LIMITS.searchQueryCharacters) {
      return jsonResponse(
        { error: 'Search query must be 200 characters or fewer.' },
        400,
      );
    }

    const experiences = query
      ? await searchExperiences(client, query)
      : await candidatesForContext(client, 'trending');

    return jsonResponse({
      data: experiences.slice(offset, offset + limit),
      total: experiences.length,
      limit,
      offset,
    });
  }

  const detailMatch = url.pathname.match(/^\/api\/experiences\/(\d{1,20})$/);

  if (detailMatch?.[1]) {
    const id = detailMatch[1];
    const [detailsResult, votesResult, iconsResult] = await Promise.allSettled([
      cached(
        `rotunnel:detail:${id}`,
        CACHE_TTL_MS.experienceDetails,
        () => client.getDetails([id]),
      ),
      cached(`rotunnel:votes:${id}`, CACHE_TTL_MS.experienceVotes, () => client.getVotes([id])),
      cached(`rotunnel:icon:${id}`, CACHE_TTL_MS.experienceIcons, () => client.getIcons([id])),
    ]);
    if (detailsResult.status === 'rejected') throw detailsResult.reason;
    const details = detailsResult.value;
    const votes = votesResult.status === 'fulfilled' ? votesResult.value : new Map();
    const icons = iconsResult.status === 'fulfilled' ? iconsResult.value : new Map();
    const detail = details.get(id);

    if (!detail) return jsonResponse({ error: 'Experience not found.' }, 404);

    const candidate: NativeCandidate = {
      universeId: id,
      nativePosition: 1,
      sourceSortId: 'experience-detail',
      raw: detail,
    };
    const vote = votes.get(id);
    const icon = icons.get(id);
    const experience = normalizeExperience(candidate, detail, vote, icon);

    return jsonResponse(experience);
  }

  return jsonResponse({ error: 'Not found.' }, 404);
}

async function handlePost(
  client: RoTunnelClient,
  url: URL,
  request: Request,
): Promise<Response> {
  const discover = url.pathname.match(/^\/api\/discover\/([a-z-]+)$/);

  if (!discover) return jsonResponse({ error: 'Not found.' }, 404);

  const contextValue = discover[1];
  if (!isRankingContext(contextValue)) {
    return jsonResponse({ error: 'Unknown discovery context.' }, 404);
  }
  const context: RankingContext = contextValue;

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > DISCOVERY_LIMITS.requestBodyBytes) {
    return jsonResponse({ error: 'Request body exceeds 64 KiB.' }, 413);
  }

  let input: Record<string, unknown>;

  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > DISCOVERY_LIMITS.requestBodyBytes) {
      return jsonResponse({ error: 'Request body exceeds 64 KiB.' }, 413);
    }
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    input = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
  }

  const limit = input.limit === undefined ? 40 : input.limit;
  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > DISCOVERY_LIMITS.resultLimit
  ) {
    return jsonResponse({ error: 'limit must be an integer from 1 to 100.' }, 400);
  }

  const genre = isExperienceGenre(input.genre) ? input.genre : undefined;
  const persona =
    typeof input.persona === 'string'
      ? seedPersonas().find((item) => item.id === input.persona)
      : undefined;
  const strategy = isRankingStrategy(input.strategy)
    ? input.strategy
    : DEFAULT_RANKING_CONFIGURATION.strategy;
  const requestedSignals = input.signals;
  const configuration: RankingConfiguration = {
    strategy,
    // Labels and descriptions are canonical server-owned metadata. Only stable
    // signal IDs and user-controlled preferences are accepted from the client.
    signals: isRankingConfiguration(requestedSignals)
      ? DEFAULT_RANKING_CONFIGURATION.signals.map((signal) => {
          const requested = requestedSignals.find((item) => item.id === signal.id);
          return requested
            ? { ...signal, enabled: requested.enabled, weight: requested.weight }
            : signal;
        })
      : DEFAULT_RANKING_CONFIGURATION.signals,
  };

  const candidates = await candidatesForContext(client, context);
  const personalized = applyPersona(candidates, persona?.id);
  const options: RankingOptions = {
    limit,
    ...(genre ? { genre } : {}),
  };
  const totalCandidates = retrieveCandidates(personalized, options).length;
  const results = rankForContext(personalized, configuration, context, options);

  return jsonResponse({
    context,
    persona: persona?.id ?? null,
    totalCandidates,
    nativeSortId: personalized[0]?.source?.sortId ?? null,
    results,
  });
}

export async function handleLiveRequest(
  request: Request,
  client: RoTunnelClient = new RoTunnelClient(),
): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const corsHeaders = new Headers({ Vary: 'Origin' });

  if (origin && allowedOrigins.includes(origin)) {
    corsHeaders.set('Access-Control-Allow-Origin', origin);
    corsHeaders.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const response =
      request.method === 'GET'
        ? await handleGet(client, url)
        : request.method === 'POST'
          ? await handlePost(client, url, request)
          : jsonResponse({ error: 'Method not allowed.' }, 405, {
              Allow: 'GET, POST, OPTIONS',
            });

    for (const [key, value] of corsHeaders) response.headers.set(key, value);
    return response;
  } catch (error) {
    if (error instanceof RoTunnelError) {
      const status = error.status === 429 ? 503 : 502;
      return jsonResponse(
        {
          error: error.message,
          code: 'RO_TUNNEL_UPSTREAM_ERROR',
          upstreamStatus: error.status,
          endpoint: error.endpoint,
        },
        status,
        corsHeaders,
      );
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return jsonResponse({ error: 'Request was cancelled.' }, 408, corsHeaders);
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Internal server error.' },
      500,
      corsHeaders,
    );
  }
}
