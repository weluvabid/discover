import type { Experience } from '../../types/experience';
import {
  calculatePersonaMatchScore,
  calculatePersonaRelevanceScore,
  seedPersonas,
} from '../../domain/personas/personas';
import {
  candidateIds,
  normalizeExperience,
  type NativeCandidate,
  type RoTunnelClient,
} from '../providers/rotunnel/index';
import type { JsonObject } from '../providers/rotunnel/types';
import { detailsForIds, iconsForIds, votesForIds } from './provider-response-cache';

export function applyPersona(experiences: Experience[], personaId?: string): Experience[] {
  if (!personaId) return experiences;

  const persona = seedPersonas().find((item) => item.id === personaId);

  if (!persona) return experiences;

  return experiences.map((experience) => ({
    ...experience,
    matchScore: calculatePersonaMatchScore(experience.genre, persona.preferences),
    personaRelevanceScore: calculatePersonaRelevanceScore(personaId, {
      title: experience.title,
      description: experience.description,
      subgenre: experience.subgenre,
      tags: experience.tags,
    }),
  }));
}

export async function enrichCandidates(
  client: RoTunnelClient,
  candidates: NativeCandidate[],
  preloadedDetails?: ReadonlyMap<string, JsonObject>,
): Promise<Experience[]> {
  if (candidates.length === 0) return [];

  const ids = candidateIds(candidates);
  const missingDetailIds = preloadedDetails
    ? ids.filter((id) => !preloadedDetails.has(id))
    : ids;
  const [detailsResult, votesResult, iconsResult] = await Promise.allSettled([
    missingDetailIds.length
      ? detailsForIds(client, missingDetailIds)
      : Promise.resolve(new Map<string, JsonObject>()),
    votesForIds(client, ids),
    iconsForIds(client, ids),
  ]);
  const details = new Map(preloadedDetails ?? []);

  if (detailsResult.status === 'fulfilled') {
    for (const [id, detail] of detailsResult.value) details.set(id, detail);
  }

  const votes = votesResult.status === 'fulfilled' ? votesResult.value : new Map();
  const icons = iconsResult.status === 'fulfilled' ? iconsResult.value : new Map();

  return candidates.flatMap((candidate) => {
    const detail = details.get(candidate.universeId) ?? candidate.raw;
    const experience = normalizeExperience(
      candidate,
      detail,
      votes.get(candidate.universeId),
      icons.get(candidate.universeId),
    );

    // A title and universe ID are the minimum safe display contract. Candidates
    // that do not satisfy it are discarded rather than returning malformed cards.
    if (!experience.title || !/^\d{1,20}$/.test(experience.id)) return [];

    return [experience];
  });
}
