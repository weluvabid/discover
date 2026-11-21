import { describe, expect, it } from 'vitest';
import { experiences } from '@/data/mocks/experiences';
import {
  DEFAULT_RANKING_CONFIGURATION,
  normalizeSignals,
  rankExperiences,
  toggleSignal,
  updateSignalWeight,
} from './ranking';

describe('discovery ranking', () => {
  it('keeps enabled weights normalized to 100%', () => {
    const signals = updateSignalWeight(DEFAULT_RANKING_CONFIGURATION.signals, 'affinity', 42);

    expect(signals.reduce((sum, signal) => sum + signal.weight, 0)).toBe(100);
    expect(signals.find((signal) => signal.id === 'affinity')?.weight).toBe(42);
  });

  it('redistributes weight when a signal is disabled', () => {
    const signals = toggleSignal(DEFAULT_RANKING_CONFIGURATION.signals, 'freshness', false);

    expect(signals.find((signal) => signal.id === 'freshness')).toMatchObject({
      enabled: false,
      weight: 0,
    });
    expect(
      signals.filter((signal) => signal.enabled).reduce((sum, signal) => sum + signal.weight, 0),
    ).toBe(100);
  });

  it('returns no contribution from disabled signals', () => {
    const signals = toggleSignal(DEFAULT_RANKING_CONFIGURATION.signals, 'diversity', false);
    const normalized = normalizeSignals(signals);

    expect(normalized.find((signal) => signal.id === 'diversity')?.weight).toBe(0);
  });

  it('returns deterministic rankings for identical input', () => {
    const first = rankExperiences(experiences, DEFAULT_RANKING_CONFIGURATION);
    const second = rankExperiences(experiences, DEFAULT_RANKING_CONFIGURATION);

    expect(first.map((item) => [item.experience.id, item.score])).toEqual(
      second.map((item) => [item.experience.id, item.score]),
    );
  });

  it('produces score contributions that sum to the displayed score', () => {
    const ranked = rankExperiences(experiences, DEFAULT_RANKING_CONFIGURATION)[0];

    expect(ranked).toBeDefined();

    if (!ranked) throw new Error('Expected at least one ranked experience.');

    const contributionTotal = Object.values(ranked.factors).reduce((sum, value) => sum + value, 0);

    expect(contributionTotal).toBeCloseTo(ranked.score, 8);
    expect(ranked.position).toBe(1);
  });
});
