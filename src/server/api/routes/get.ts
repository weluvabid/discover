import { DISCOVERY_LIMITS, CACHE_TTL_MS, isExperienceGenre } from '../../../config/discovery';
import { seedPersonas } from '../../../domain/personas/personas';
import { jsonResponse } from '../http/json-response';
import type { RoTunnelClient } from '../../providers/rotunnel/index';
import { normalizeExperience } from '../../providers/rotunnel/index';
import { cached, candidatesForContext, searchExperiences } from '../../services/discovery-data';
import type { ExperienceGenre } from '../../../types/experience';
import type { NativeCandidate } from '../../providers/rotunnel/types';
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
