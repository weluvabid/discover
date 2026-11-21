import { useMemo, useState } from 'react';
import { experiences } from '@/data/mocks/experiences';
import type { Experience } from '@/types/experience';

export function useDiscovery() {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return experiences.filter((experience) => {
      const searchable = [
        experience.title,
        experience.creator,
        experience.genre,
        experience.subgenre,
        ...experience.tags,
      ]
        .join(' ')
        .toLowerCase();
      const matchesQuery = normalizedQuery.length === 0 || searchable.includes(normalizedQuery);

      return matchesQuery;
    });
  }, [query]);

  return { query, setQuery, results };
}

export function searchExperiences(query: string, items: Experience[] = experiences): Experience[] {
  const normalizedQuery = query.trim().toLowerCase();

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
      .toLowerCase()
      .includes(normalizedQuery),
  );
}
