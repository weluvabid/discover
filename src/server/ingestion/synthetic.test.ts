import { describe, expect, it } from 'vitest';
import { calculatePersonaMatchScore, generateSyntheticMetrics } from './synthetic';

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
    const preferences = ['Simulation', 'Puzzle'];
    const direct = calculatePersonaMatchScore('Simulation', preferences, 75, 'builder');
    const adjacent = calculatePersonaMatchScore('Co-op', preferences, 75, 'builder');
    const unrelated = calculatePersonaMatchScore('Horror', preferences, 75, 'builder');

    expect(direct).toBeGreaterThan(adjacent);
    expect(adjacent).toBeGreaterThan(unrelated);
  });

  it('uses persona-specific metadata to distinguish profiles with shared genre preferences', () => {
    const builderPreferences = ['Simulation', 'Puzzle'];
    const progressionPreferences = ['Simulation', 'Action RPG'];
    const builder = calculatePersonaMatchScore(
      'Simulation',
      builderPreferences,
      75,
      'builder',
      'Build a factory tycoon',
    );
    const tactician = calculatePersonaMatchScore(
      'Simulation',
      builderPreferences,
      75,
      'tactician',
      'Build a factory tycoon',
    );
    const collector = calculatePersonaMatchScore(
      'Simulation',
      progressionPreferences,
      75,
      'collector',
      'Collect pets and trade eggs',
    );
    const completionist = calculatePersonaMatchScore(
      'Simulation',
      progressionPreferences,
      75,
      'completionist',
      'Collect pets and trade eggs',
    );

    expect(builder).toBeGreaterThan(tactician);
    expect(collector).toBeGreaterThan(completionist);
  });
});
