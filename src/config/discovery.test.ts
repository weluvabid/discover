import { describe, expect, it } from 'vitest';
import { DEFAULT_RANKING_CONFIGURATION } from '../features/discovery/engine/ranking';
import {
  DISCOVERY_CONTEXTS,
  DISCOVERY_STRATEGIES,
  isExperienceGenre,
  isRankingConfiguration,
  isRankingContext,
  isRankingStrategy,
  isSearchSort,
} from './discovery';

describe('discovery configuration', () => {
  it('exposes every supported ranking context and strategy', () => {
    expect(isRankingContext('trending')).toBe(true);
    expect(isRankingContext('unknown')).toBe(false);
    expect(isRankingStrategy('personalized')).toBe(true);
    expect(isRankingStrategy('unknown')).toBe(false);
    expect(DISCOVERY_CONTEXTS).toContain('recently-launched');
    expect(DISCOVERY_STRATEGIES.personalized.label).toBe('Personalized');
    expect(isSearchSort('players')).toBe(true);
    expect(isSearchSort('toString')).toBe(false);
  });

  it('validates known genre filters only', () => {
    expect(isExperienceGenre('All')).toBe(true);
    expect(isExperienceGenre('Action RPG')).toBe(true);
    expect(isExperienceGenre('Town and City')).toBe(false);
  });

  it('accepts a complete unique signal preference set without trusting client labels', () => {
    const signals = DEFAULT_RANKING_CONFIGURATION.signals.map(({ id, weight, enabled }) => ({
      id,
      weight,
      enabled,
    }));

    expect(isRankingConfiguration(signals)).toBe(true);
    expect(isRankingConfiguration([...signals, signals[0]])).toBe(false);
    expect(
      isRankingConfiguration(
        signals.map((signal, index) => (index === 0 ? { ...signal, weight: 101 } : signal)),
      ),
    ).toBe(false);
  });
});
