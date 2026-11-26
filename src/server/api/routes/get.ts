import {
  DISCOVERY_LIMITS,
  isExperienceGenre,
  isRankingConfiguration,
  isRankingStrategy,
  isRankingContext,
  isSearchSort,
} from '../../../config/discovery';
import {
  DEFAULT_RANKING_CONFIGURATION,
  rankForContext,
  retrieveCandidates,
  type RankingConfiguration,
} from '../../../features/discovery/engine/ranking';
import { seedPersonas } from '../../../domain/personas/personas';
import { jsonResponse } from '../http/json-response';
import { awaitWithSignal, throwIfAborted } from '../http/abortable';
import type { RoTunnelClient } from '../../providers/rotunnel/index';
import { normalizeExperience } from '../../providers/rotunnel/index';
import { candidatesForContext, searchExperiences } from '../../services/discovery-data';
import type { NativeCandidate } from '../../providers/rotunnel/types';
import { applyPersona, enrichCandidates } from '../../services/experience-enrichment';
import {
  genreCatalogueCounts,
  genreCatalogueFor,
  genreCataloguePage,
} from '../../services/genre-catalogue';
import { sortSearchResults } from '../../services/search-sorting';
import { withSearchRelevance } from '../../services/search-relevance';
import { detailsForIds, iconsForIds, votesForIds } from '../../services/provider-response-cache';

const CACHE_12_HOURS = 'public, max-age=3600, s-maxage=43200, stale-while-revalidate=172800';
const CACHE_24_HOURS = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=172800';

function rankingConfigurationFromUrl(url: URL): RankingConfiguration {
  const strategyValue = url.searchParams.get('strategy');
  const signalsValue = url.searchParams.get('signals');
  let requestedSignals: unknown;

  if (signalsValue && signalsValue.length <= 4_096) {
    try {
      requestedSignals = JSON.parse(signalsValue);
    } catch {
      requestedSignals = undefined;
    }
  }

  const strategy = isRankingStrategy(strategyValue)
    ? strategyValue
    : DEFAULT_RANKING_CONFIGURATION.strategy;
  const validSignals = isRankingConfiguration(requestedSignals) ? requestedSignals : undefined;
  const signals = validSignals
    ? DEFAULT_RANKING_CONFIGURATION.signals.map((signal) => {
        const requested = validSignals.find((item) => item.id === signal.id);

        return requested
          ? { ...signal, enabled: requested.enabled, weight: requested.weight }
          : signal;
      })
    : DEFAULT_RANKING_CONFIGURATION.signals;

  return { strategy, signals };
}

function createSearchRankingConfiguration(
  configuration: RankingConfiguration,
): RankingConfiguration {
  const otherSignals = configuration.signals.filter(
    (signal) => signal.id !== 'relevance' && signal.enabled,
  );
  const otherWeight = otherSignals.reduce((total, signal) => total + signal.weight, 0);
  const relevanceWeight = otherWeight === 0 ? 100 : 60;
  const remainingWeight = 100 - relevanceWeight;
  const shares = otherSignals.map((signal) => {
    const exact = otherWeight > 0 ? (signal.weight / otherWeight) * remainingWeight : 0;

    return { id: signal.id, weight: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = remainingWeight - shares.reduce((total, share) => total + share.weight, 0);
  const orderedShares = [...shares].sort(
    (a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id),
  );

  for (const share of orderedShares) {
    if (remaining <= 0) {
      break;
    }

    share.weight += 1;
    remaining -= 1;
  }

  const weights = new Map(shares.map((share) => [share.id, share.weight]));

  return {
    strategy: configuration.strategy,
    signals: configuration.signals.map((signal) =>
      signal.id === 'relevance'
        ? { ...signal, enabled: true, weight: relevanceWeight }
        : {
            ...signal,
            enabled: weights.has(signal.id),
            weight: weights.get(signal.id) ?? 0,
          },
    ),
  };
}

export async function handleGet(
  client: RoTunnelClient,
  url: URL,
  signal?: AbortSignal,
): Promise<Response> {
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

  if (
    ['/api/search', '/api/experiences'].includes(url.pathname) ||
    /^\/api\/discover\/[a-z-]+$/.test(url.pathname)
  ) {
    const strategy = url.searchParams.get('strategy');

    if (strategy && !isRankingStrategy(strategy)) {
      return jsonResponse({ error: 'Unknown ranking strategy.' }, 400);
    }

    const signals = url.searchParams.get('signals');

    if (signals) {
      if (signals.length > 4_096) {
        return jsonResponse({ error: 'Ranking signals are too large.' }, 400);
      }

      try {
        if (!isRankingConfiguration(JSON.parse(signals))) {
          return jsonResponse({ error: 'Invalid ranking signals.' }, 400);
        }
      } catch {
        return jsonResponse({ error: 'Invalid ranking signals.' }, 400);
      }
    }
  }

  const discoveryMatch = url.pathname.match(/^\/api\/discover\/([a-z-]+)$/);

  if (discoveryMatch?.[1]) {
    const contextValue = discoveryMatch[1];

    if (!isRankingContext(contextValue)) {
      return jsonResponse({ error: 'Unknown discovery context.' }, 404);
    }

    const limit = Number(url.searchParams.get('limit') ?? (contextValue === 'featured' ? 1 : 8));

    if (!Number.isSafeInteger(limit) || limit < 1 || limit > DISCOVERY_LIMITS.resultLimit) {
      return jsonResponse({ error: 'Invalid discovery result limit.' }, 400);
    }

    const personaId = url.searchParams.get('persona') ?? undefined;

    if (personaId && !seedPersonas().some((item) => item.id === personaId)) {
      return jsonResponse({ error: 'Unknown persona.' }, 400);
    }

    const persona = personaId;
    const requestedGenre = url.searchParams.get('genre');
    const genre = isExperienceGenre(requestedGenre) ? requestedGenre : undefined;

    if (requestedGenre && !genre) {
      return jsonResponse({ error: 'Unknown genre.' }, 400);
    }

    const candidates = await awaitWithSignal(
      candidatesForContext(client, contextValue, personaId),
      signal,
    );

    throwIfAborted(signal);
    const personalized = applyPersona(candidates, persona);
    const options = { limit, ...(genre ? { genre } : {}) };
    const totalCandidates = retrieveCandidates(personalized, options).length;
    const results = rankForContext(
      personalized,
      rankingConfigurationFromUrl(url),
      contextValue,
      options,
    );

    return jsonResponse(
      {
        context: contextValue,
        persona: persona ?? null,
        totalCandidates,
        nativeSortId: personalized[0]?.source?.sortId ?? null,
        results,
      },
      200,
      { 'Cache-Control': CACHE_12_HOURS },
    );
  }

  if (url.pathname === '/api/genres') {
    const catalogue = await awaitWithSignal(genreCatalogueFor(client), signal);

    throwIfAborted(signal);

    return jsonResponse({ data: genreCatalogueCounts(catalogue) }, 200, {
      'Cache-Control': CACHE_24_HOURS,
    });
  }

  if (url.pathname === '/api/search') {
    const query = url.searchParams.get('q')?.trim() ?? '';

    if (query.length > DISCOVERY_LIMITS.searchQueryCharacters) {
      return jsonResponse({ error: 'Search query must be 200 characters or fewer.' }, 400);
    }

    if (!query) {
      return jsonResponse({ data: [], rankedData: [] }, 200, { 'Cache-Control': CACHE_12_HOURS });
    }

    const requestedGenre = url.searchParams.get('genre');
    const genre = isExperienceGenre(requestedGenre) ? requestedGenre : undefined;

    if (requestedGenre && !genre) {
      return jsonResponse({ error: 'Unknown genre.' }, 400);
    }

    const requestedSort = url.searchParams.get('sort') ?? 'relevance';

    if (!isSearchSort(requestedSort)) {
      return jsonResponse({ error: 'Unknown search sort.' }, 400);
    }

    const sort = requestedSort;
    const personaId = url.searchParams.get('persona') ?? undefined;

    if (personaId && !seedPersonas().some((item) => item.id === personaId)) {
      return jsonResponse({ error: 'Unknown persona.' }, 400);
    }

    const persona = personaId;
    const experiences = await awaitWithSignal(searchExperiences(client, query), signal);

    throwIfAborted(signal);
    const filtered =
      genre && genre !== 'All'
        ? experiences.filter(
            (experience) => experience.genre === genre || experience.tags.includes(genre),
          )
        : experiences;
    const candidates = withSearchRelevance(applyPersona(filtered, persona), query);
    const ranked = rankForContext(
      candidates,
      createSearchRankingConfiguration(rankingConfigurationFromUrl(url)),
      'recommended',
      { limit: candidates.length },
    );
    const rankedById = new Map(ranked.map((item) => [item.experience.id, item]));
    const sortedExperiences =
      sort === 'relevance'
        ? ranked
        : sortSearchResults(
            ranked.map((item) => item.experience),
            sort,
          ).flatMap((experience) => {
            const item = rankedById.get(experience.id);

            return item ? [item] : [];
          });
    const rankedData = sortedExperiences.map((item, index) => ({ ...item, position: index + 1 }));

    return jsonResponse({ data: rankedData.map((item) => item.experience), rankedData }, 200, {
      'Cache-Control': CACHE_12_HOURS,
    });
  }

  if (url.pathname === '/api/experiences') {
    const limit = Number(url.searchParams.get('limit') ?? 100);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const query = url.searchParams.get('q')?.trim();
    const requestedGenre = url.searchParams.get('genre');
    const genre = isExperienceGenre(requestedGenre) ? requestedGenre : undefined;

    if (requestedGenre && !genre) {
      return jsonResponse({ error: 'Unknown genre.' }, 400);
    }

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
      return jsonResponse({ error: 'Search query must be 200 characters or fewer.' }, 400);
    }

    if (query && genre) {
      return jsonResponse({ error: 'Use either query search or genre browsing, not both.' }, 400);
    }

    const requestedPersona = url.searchParams.get('persona');

    if (requestedPersona && !seedPersonas().some((item) => item.id === requestedPersona)) {
      return jsonResponse({ error: 'Unknown persona.' }, 400);
    }

    if (genre) {
      const page = await awaitWithSignal(
        genreCataloguePage(client, genre, offset, limit, requestedPersona ?? undefined),
        signal,
      );

      throwIfAborted(signal);
      const experiences = await awaitWithSignal(
        enrichCandidates(client, page.candidates, page.details),
        signal,
      );

      throwIfAborted(signal);
      const personalized = applyPersona(experiences, url.searchParams.get('persona') ?? undefined);
      const rankedData = rankForContext(
        personalized,
        rankingConfigurationFromUrl(url),
        'recommended',
        { limit: personalized.length, genre },
      );

      return jsonResponse(
        {
          data: rankedData.map((item) => item.experience),
          rankedData: rankedData.map((item, index) => ({ ...item, position: offset + index + 1 })),
          total: page.total,
          limit,
          offset,
          hasMore: offset + experiences.length < page.total,
        },
        200,
        { 'Cache-Control': CACHE_24_HOURS },
      );
    }

    const experiences = query
      ? await awaitWithSignal(searchExperiences(client, query), signal)
      : await awaitWithSignal(candidatesForContext(client, 'trending'), signal);

    return jsonResponse({
      data: experiences.slice(offset, offset + limit),
      total: experiences.length,
      limit,
      offset,
      hasMore: offset + limit < experiences.length,
    });
  }

  const detailMatch = url.pathname.match(/^\/api\/experiences\/(\d{1,20})$/);

  if (detailMatch?.[1]) {
    const id = detailMatch[1];
    const [detailsResult, votesResult, iconsResult] = await awaitWithSignal(
      Promise.allSettled([
        detailsForIds(client, [id]),
        votesForIds(client, [id]),
        iconsForIds(client, [id]),
      ]),
      signal,
    );

    throwIfAborted(signal);

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
