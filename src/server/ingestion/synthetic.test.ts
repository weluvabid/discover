import { describe, expect, it } from 'vitest';
import { generateSyntheticMetrics } from './synthetic';

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
