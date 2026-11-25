import type { Experience } from '../../types/experience';

const normalize = (value: string) => value.normalize('NFKC').toLowerCase().trim();

/** Deterministic lexical relevance; no network calls or model inference. */
export function scoreSearchRelevance(experience: Experience, query: string): number {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return 0;
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const title = normalize(experience.title);
  const creator = normalize(experience.creator);
  const subgenre = normalize(experience.subgenre);
  const tags = experience.tags.map(normalize);
  const description = normalize(experience.description);
  let score = 0;

  if (title === normalizedQuery) score = 1;
  else if (title.startsWith(normalizedQuery)) score = 0.96;
  else if (title.includes(normalizedQuery)) score = 0.9;
  else if (creator === normalizedQuery) score = 0.88;
  else if (creator.includes(normalizedQuery)) score = 0.8;
  else {
    const matches = tokens.filter((token) =>
      [title, creator, subgenre, ...tags].some((field) => field.includes(token)),
    ).length;
    const tokenCoverage = matches / tokens.length;
    const metadataMatch = [title, creator, subgenre, ...tags].some((field) =>
      tokens.every((token) => field.includes(token)),
    );

    score = Math.max(tokenCoverage * 0.72, metadataMatch ? 0.78 : 0);

    if (score === 0 && tokens.some((token) => description.includes(token))) score = 0.2;
  }

  return Math.min(1, Math.max(0, score));
}

export function withSearchRelevance(experiences: Experience[], query: string): Experience[] {
  return experiences.map((experience) => ({
    ...experience,
    queryRelevanceScore: scoreSearchRelevance(experience, query),
  }));
}
