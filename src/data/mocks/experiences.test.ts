import { describe, expect, it } from 'vitest';
import { experiences } from './experiences';
import { searchExperiences } from '@/features/search/utils/search-experiences';

describe('searchExperiences', () => {
  it('returns the complete catalog for an empty query', () => {
    expect(searchExperiences('', experiences)).toHaveLength(experiences.length);
  });

  it('matches titles, creators, genres and tags without case sensitivity', () => {
    expect(
      searchExperiences('CYBERPUNK', experiences).map((experience) => experience.id),
    ).toContain('vanguard-cyber-drift');
    expect(
      searchExperiences('aether dynamic', experiences).map((experience) => experience.id),
    ).toContain('deep-descent');
    expect(searchExperiences('horror', experiences).length).toBeGreaterThan(0);
  });

  it('trims surrounding whitespace and returns no results for unknown terms', () => {
    expect(searchExperiences('  racing  ', experiences).length).toBeGreaterThan(0);
    expect(searchExperiences('not-a-real-experience', experiences)).toEqual([]);
  });
});

describe('experience fixtures', () => {
  it('contains twenty uniquely identified experiences with distinct artwork', () => {
    const ids = experiences.map((experience) => experience.id);
    const artwork = experiences.map((experience) => experience.artwork.thumbnail);

    expect(experiences).toHaveLength(20);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(artwork).size).toBe(artwork.length);
  });
});
