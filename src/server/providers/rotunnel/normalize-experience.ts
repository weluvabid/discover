import type { Experience } from '../../../types/experience';
import {
  classifyGenre,
  firstMeaningfulLabel,
  meaningfulLabel,
} from '../../../domain/taxonomy/genre-classifier';
import { isRecord, numericValue, stringValue } from './response-parsers';
import type { JsonObject, NativeCandidate } from './types';

export function normalizeExperience(
  candidate: NativeCandidate,
  detail: JsonObject,
  votes: JsonObject | undefined,
  icon: string | undefined,
): Experience {
  const creator = isRecord(detail.creator) ? detail.creator : {};
  const title =
    stringValue(detail.name, candidate.raw.name, candidate.raw.title) ??
    `Experience ${candidate.universeId}`;
  const description = stringValue(detail.description, candidate.raw.description) ?? '';
  const nativeGenre = firstMeaningfulLabel(
    detail.genre,
    detail.genreName,
    candidate.raw.genre,
    candidate.raw.genreName,
  );
  const rawSubgenre = meaningfulLabel(stringValue(candidate.raw.subgenre));
  const classification = classifyGenre({
    nativeGenre: rawSubgenre ?? nativeGenre,
    title,
    description,
  });
  const { genre } = classification;
  const created = stringValue(detail.created, detail.createdAt, candidate.raw.created);
  const updated = stringValue(detail.updated, detail.updatedAt, candidate.raw.updated);
  const upVotes = numericValue(votes?.upVotes, votes?.upvotes);
  const downVotes = numericValue(votes?.downVotes, votes?.downvotes);
  const voteCount =
    upVotes !== undefined && downVotes !== undefined ? upVotes + downVotes : undefined;
  const rating =
    voteCount !== undefined && voteCount > 0 && upVotes !== undefined
      ? (upVotes / voteCount) * 100
      : undefined;
  const activePlayers = numericValue(detail.playing, detail.playerCount, candidate.raw.playerCount);
  const rootPlaceId = stringValue(
    detail.rootPlaceId,
    detail.placeId,
    candidate.raw.rootPlaceId,
    candidate.raw.placeId,
  );
  const rawCreator = isRecord(candidate.raw.creator) ? candidate.raw.creator : {};
  const creatorName =
    stringValue(creator.name, detail.creatorName, rawCreator.name, candidate.raw.creatorName) ??
    'Unknown creator';
  const favorites = numericValue(detail.favoritedCount, detail.favorites);
  const visits = numericValue(detail.visits);
  const inferredGenreTag =
    classification.confidence === 'high' || classification.confidence === 'medium'
      ? genre
      : undefined;
  const tags = [
    ...new Set(
      [nativeGenre, rawSubgenre, inferredGenreTag].filter((tag): tag is string => Boolean(tag)),
    ),
  ];
  const experience: Experience = {
    id: candidate.universeId,
    ...(rootPlaceId ? { robloxUrl: `https://www.roblox.com/games/${rootPlaceId}` } : {}),
    title,
    description,
    creator: creatorName,
    creatorVerified: creator.hasVerifiedBadge === true,
    genre,
    genreConfidence: classification.confidence,
    subgenre:
      nativeGenre ??
      rawSubgenre ??
      (classification.confidence === 'unknown' ? 'Unclassified' : genre),
    artwork: {
      thumbnail: icon ?? '',
      alt: `${title} Roblox experience artwork`,
    },
    metrics: {
      ...(activePlayers !== undefined ? { activePlayers } : {}),
      ...(rating !== undefined ? { rating } : {}),
      ...(voteCount !== undefined ? { voteCount } : {}),
      ...(favorites !== undefined ? { favorites } : {}),
      ...(visits !== undefined ? { visits } : {}),
    },
    ...(created ? { publishedAt: created } : {}),
    ...(updated ? { updatedAt: updated } : {}),
    tags,
    source: {
      provider: 'rotunnel',
      sortId: candidate.sourceSortId,
      nativePosition: candidate.nativePosition,
    },
  };

  return experience;
}
