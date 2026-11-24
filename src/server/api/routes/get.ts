import { CACHE_TTL_MS, DISCOVERY_LIMITS, isExperienceGenre } from '../../../config/discovery';
import { seedPersonas } from '../../../domain/personas/personas';
import { jsonResponse } from '../http/json-response';
import type { RoTunnelClient } from '../../providers/rotunnel/index';
import { normalizeExperience } from '../../providers/rotunnel/index';
import { cached, candidatesForContext, searchExperiences } from '../../services/discovery-data';
import type { NativeCandidate } from '../../providers/rotunnel/types';
import { enrichCandidates } from '../../services/experience-enrichment';
import {
  genreCatalogueCounts,
  genreCatalogueFor,
  genreCataloguePage,
} from '../../services/genre-catalogue';
import { sortSearchResults } from '../../services/search-sorting';

export async function handleGet(client: RoTunnelClient, url: URL): Promise<Response> {
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
    const catalogue = await genreCatalogueFor(client);

    return jsonResponse({ data: genreCatalogueCounts(catalogue) });
  }

  if (url.pathname === '/api/search') {
    const query = url.searchParams.get('q')?.trim() ?? '';

    if (query.length > DISCOVERY_LIMITS.searchQueryCharacters) {
      return jsonResponse({ error: 'Search query must be 200 characters or fewer.' }, 400);
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

    if (genre) {
      const page = await genreCataloguePage(client, genre, offset, limit);
      const experiences = await enrichCandidates(client, page.candidates, page.details);

      return jsonResponse({
        data: experiences,
        total: page.total,
        limit,
        offset,
        hasMore: offset + experiences.length < page.total,
      });
    }

    const experiences = query
      ? await searchExperiences(client, query)
      : await candidatesForContext(client, 'trending');

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
    const [detailsResult, votesResult, iconsResult] = await Promise.allSettled([
      cached(`rotunnel:detail:${id}`, CACHE_TTL_MS.experienceDetails, () =>
        client.getDetails([id]),
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
