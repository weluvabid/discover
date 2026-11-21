import { describe, expect, it } from 'vitest';
import { experiences } from '@/data/mocks/experiences';
import { filterExperiencesByGenre, searchExperiences } from './search-experiences';

describe('experience search', () => {
  it('matches titles, creators, genres and tags without case sensitivity', () => {
    expect(searchExperiences('AETHER DYNAMIC', experiences).map(({ id }) => id)).toContain(
      'deep-descent',
    );
    expect(searchExperiences('ocean', experiences).map(({ id }) => id)).toContain('deep-descent');
  });

  it('returns the supplied catalog for an empty query', () => {
    expect(searchExperiences('  ', experiences)).toBe(experiences);
  });

  it('filters genres across primary genre, tags and subgenre', () => {
    const filtered = filterExperiencesByGenre(experiences, 'Exploration');

    expect(
      filtered.every(
        (experience) =>
          experience.genre === 'Exploration' ||
          experience.tags.includes('Exploration') ||
          experience.subgenre.toLowerCase().includes('exploration'),
      ),
    ).toBe(true);
  });
});
