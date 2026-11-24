import { describe, expect, it } from 'vitest';
import {
  calculatePersonaMatchScore,
  calculatePersonaRelevanceScore,
  generateSyntheticMetrics,
} from './synthetic';

const input = {
  universeId: '2711375305',
  genre: 'Shopping',
  sourceActivePlayers: 19469,
  rating: 94,
  seed: 20261121,
};

describe('synthetic metrics', () => {
  it('is reproducible for a stable seed and universe ID', () => {
    expect(generateSyntheticMetrics(input)).toEqual(generateSyntheticMetrics(input));
  });

  it('keeps retention curves monotonic and bounded', () => {
    const result = generateSyntheticMetrics(input);

    expect(result.d1Retention).toBeGreaterThanOrEqual(result.d7Retention);
    expect(result.d7Retention).toBeGreaterThanOrEqual(result.d30Retention);

    for (const value of [
      result.d1Retention,
      result.d7Retention,
      result.d30Retention,
      result.repeatPlayRate,
    ]) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it('generates a match score for every seeded persona', () => {
    expect(Object.keys(generateSyntheticMetrics(input).matchScores)).toHaveLength(12);
  });
});

describe('persona match scoring', () => {
  it('prioritizes exact preferred genres over adjacent and unrelated genres', () => {
    const preferences = ['Simulation', 'Puzzle'] as const;
    const direct = calculatePersonaMatchScore('Simulation', preferences);
    const adjacent = calculatePersonaMatchScore('Co-op', preferences);
    const unrelated = calculatePersonaMatchScore('Horror', preferences);

    expect(direct).toBeGreaterThan(adjacent);
    expect(adjacent).toBeGreaterThan(unrelated);
  });

  it('keeps genre affinity independent from topical keyword relevance', () => {
    const preferences = ['Simulation', 'Puzzle'] as const;
    const genreAffinity = calculatePersonaMatchScore('Simulation', preferences);

    const builderRelevance = calculatePersonaRelevanceScore('builder', {
      title: 'Factory Tycoon',
      description: 'Build and design your own production line.',
      subgenre: 'Tycoon',
      tags: ['factory', 'building', 'automation'],
    });
    const tacticianRelevance = calculatePersonaRelevanceScore('tactician', {
      title: 'Factory Tycoon',
      description: 'Build and design your own production line.',
      subgenre: 'Tycoon',
      tags: ['factory', 'building', 'automation'],
    });

    expect(genreAffinity).toBe(84);
    expect(builderRelevance).toBeGreaterThan(tacticianRelevance);
  });

  it('does not reward repeated or longer descriptions for the same matched keywords', () => {
    const concise = calculatePersonaRelevanceScore('collector', {
      title: 'Pet Collector',
      description: 'Collect pets and trade eggs.',
      subgenre: 'Collection',
      tags: ['pets', 'trading'],
    });
    const verbose = calculatePersonaRelevanceScore('collector', {
      title: 'Pet Collector',
      description: `Collect pets and trade eggs. ${'Pets and collecting. '.repeat(100)}`,
      subgenre: 'Collection',
      tags: ['pets', 'trading'],
    });

    expect(verbose).toBe(concise);
  });
});
