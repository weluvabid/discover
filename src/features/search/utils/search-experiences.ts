import type { Experience, ExperienceGenre } from '@/types/experience';

export function searchExperiences(query: string, items: Experience[]): Experience[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((experience) =>
    [
      experience.title,
      experience.creator,
      experience.genre,
      experience.subgenre,
      ...experience.tags,
    ]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalizedQuery),
  );
}

export function filterExperiencesByGenre(
  items: Experience[],
  genre: ExperienceGenre | 'All',
): Experience[] {
  if (genre === 'All') {
    return items;
  }

  const normalizedGenre = genre.toLocaleLowerCase();

  return items.filter(
    (experience) =>
      experience.genre === genre ||
      experience.tags.includes(genre) ||
      experience.subgenre.toLocaleLowerCase().includes(normalizedGenre),
  );
}
