import { describe, expect, it } from 'vitest';
import { experiences } from '@/data/mocks/experiences';
import {
  DEFAULT_RANKING_CONFIGURATION,
  filterEligibleCandidates,
  getEligibility,
  isDefaultRankingConfiguration,
  normalizeSignals,
  rankExperiences,
  rankForContext,
  retrieveCandidates,
  toggleSignal,
  updateSignalWeight,
} from './ranking';

const FIXED_NOW = new Date('2026-11-21T00:00:00.000Z');

describe('discovery ranking', () => {
  it('identifies the default ranking without serializing the configuration', () => {
    expect(isDefaultRankingConfiguration(DEFAULT_RANKING_CONFIGURATION)).toBe(true);
    expect(
      isDefaultRankingConfiguration({ ...DEFAULT_RANKING_CONFIGURATION, strategy: 'balanced' }),
    ).toBe(false);
  });

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
    const first = rankExperiences(experiences, DEFAULT_RANKING_CONFIGURATION, FIXED_NOW);
    const second = rankExperiences(experiences, DEFAULT_RANKING_CONFIGURATION, FIXED_NOW);

    expect(first.map((item) => [item.experience.id, item.score])).toEqual(
      second.map((item) => [item.experience.id, item.score]),
    );
  });

  it('produces weighted contributions that reconcile to the pre-rerank score', () => {
    const ranked = rankExperiences(experiences, DEFAULT_RANKING_CONFIGURATION, FIXED_NOW)[0];

    expect(ranked).toBeDefined();

    if (!ranked) throw new Error('Expected at least one ranked experience.');

    const contributionTotal = Object.values(ranked.factors).reduce((sum, value) => sum + value, 0);

    expect(contributionTotal).toBeCloseTo(ranked.explanation.weightedScore, 8);
    expect(ranked.score).toBeCloseTo(ranked.explanation.finalScore, 8);
    expect(ranked.score).toBeCloseTo(
      ranked.explanation.weightedScore + ranked.explanation.diversityAdjustment,
      8,
    );
    expect(ranked.position).toBe(1);
  });

  it('uses a selected play-style match score to change recommendation order', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const strongMatch = {
      ...fixture,
      id: 'persona-strong-match',
      matchScore: 99,
      title: 'Strong profile match',
    };
    const weakMatch = {
      ...fixture,
      id: 'persona-weak-match',
      matchScore: 20,
      title: 'Weak profile match',
    };
    const ranked = rankForContext(
      [weakMatch, strongMatch],
      DEFAULT_RANKING_CONFIGURATION,
      'recommended',
      { now: FIXED_NOW, limit: 2 },
    );

    expect(ranked.map((item) => item.experience.id)).toEqual([
      'persona-strong-match',
      'persona-weak-match',
    ]);
    expect(ranked[0]?.factors.affinity).toBeGreaterThan(ranked[1]?.factors.affinity ?? 0);
    expect(ranked[0]?.factors.relevance).toBeGreaterThan(ranked[1]?.factors.relevance ?? 0);
  });

  it('uses deterministic synthetic retention and repeat-play inputs in engagement quality', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const lowEngagement = {
      ...fixture,
      metrics: {
        ...fixture.metrics,
        d1Retention: 0.12,
        d7Retention: 0.04,
        d30Retention: 0.01,
        repeatPlayRate: 0.08,
        averageSessionMinutes: 8,
      },
    };
    const highEngagement = {
      ...fixture,
      metrics: {
        ...fixture.metrics,
        d1Retention: 0.48,
        d7Retention: 0.32,
        d30Retention: 0.2,
        repeatPlayRate: 0.62,
        averageSessionMinutes: 38,
      },
    };
    const low = rankExperiences([lowEngagement], DEFAULT_RANKING_CONFIGURATION, FIXED_NOW)[0];
    const high = rankExperiences([highEngagement], DEFAULT_RANKING_CONFIGURATION, FIXED_NOW)[0];

    expect(low).toBeDefined();
    expect(high).toBeDefined();
    expect(high?.factors.quality).toBeGreaterThan(low?.factors.quality ?? 0);
  });

  it('keeps context eligibility separate from ranking scores', () => {
    const trending = rankForContext(experiences, DEFAULT_RANKING_CONFIGURATION, 'trending', {
      now: FIXED_NOW,
    });
    const hidden = rankForContext(experiences, DEFAULT_RANKING_CONFIGURATION, 'hidden-gems', {
      now: FIXED_NOW,
    });
    const recent = rankForContext(experiences, DEFAULT_RANKING_CONFIGURATION, 'recently-launched', {
      now: FIXED_NOW,
    });

    expect(trending.every((item) => (item.experience.metrics.weeklyChange ?? 0) > 0)).toBe(true);
    expect(
      hidden.every(
        (item) =>
          item.experience.metrics.activePlayers <= 10_000 && item.experience.metrics.rating >= 88,
      ),
    ).toBe(true);
    expect(
      recent.every((item) => {
        const age = (FIXED_NOW.getTime() - Date.parse(item.experience.publishedAt)) / 86_400_000;

        return age >= 0 && age <= 30;
      }),
    ).toBe(true);
  });


  it('uses the catalog observation clock for freshness and Recently Launched', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const datasetRelative = {
      ...fixture,
      publishedAt: '2024-11-01T00:00:00.000Z',
      updatedAt: '2024-11-12T00:00:00.000Z',
      freshnessReferenceAt: '2024-11-13T09:56:00.000Z',
    };
    const recent = rankForContext(
      [datasetRelative],
      DEFAULT_RANKING_CONFIGURATION,
      'recently-launched',
      { limit: 1 },
    );

    expect(recent).toHaveLength(1);
    expect(recent[0]?.explanation.eligibilityReasons[0]).toContain('12.4 days ago');
  });

  it('uses update recency as a freshness signal independently of launch age', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const recentlyUpdated = {
      ...fixture,
      publishedAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2024-11-12T00:00:00.000Z',
    };
    const staleUpdate = {
      ...recentlyUpdated,
      updatedAt: '2020-01-01T00:00:00.000Z',
    };
    const ranked = rankExperiences(
      [staleUpdate, recentlyUpdated],
      DEFAULT_RANKING_CONFIGURATION,
      new Date('2024-11-13T00:00:00.000Z'),
    );

    const fresh = ranked.find((item) => item.experience.updatedAt === recentlyUpdated.updatedAt);
    const stale = ranked.find((item) => item.experience.updatedAt === staleUpdate.updatedAt);

    expect(fresh?.factors.freshness).toBeGreaterThan(stale?.factors.freshness ?? 0);
  });

  it('rejects future-dated releases from Recently Launched', () => {
    const experience = experiences[0];

    if (!experience) throw new Error('Expected an experience fixture.');

    const future = { ...experience, publishedAt: '2026-11-22T00:00:00.000Z' };

    expect(getEligibility('recently-launched', future, FIXED_NOW).eligible).toBe(false);
  });

  it('applies genre constraints before ranking each context', () => {
    const results = rankForContext(experiences, DEFAULT_RANKING_CONFIGURATION, 'recommended', {
      now: FIXED_NOW,
      genre: 'Horror',
    });

    expect(
      results.every(
        (item) =>
          item.experience.genre === 'Horror' ||
          item.experience.tags.includes('Horror') ||
          item.experience.subgenre.toLowerCase().includes('horror'),
      ),
    ).toBe(true);
  });

  it('returns a stable empty result for empty candidate pools', () => {
    expect(rankForContext([], DEFAULT_RANKING_CONFIGURATION, 'trending')).toEqual([]);
  });

  it('keeps scores bounded and produces a single featured selection', () => {
    const featured = rankForContext(experiences, DEFAULT_RANKING_CONFIGURATION, 'featured', {
      now: FIXED_NOW,
      limit: 1,
    });

    expect(featured).toHaveLength(1);
    expect(featured[0]?.score).toBeGreaterThanOrEqual(0);
    expect(featured[0]?.score).toBeLessThanOrEqual(100);
  });

  it('does not let an all-disabled configuration produce non-zero scores', () => {
    const disabled = DEFAULT_RANKING_CONFIGURATION.signals.map((signal) => ({
      ...signal,
      enabled: false,
      weight: 0,
    }));
    const ranked = rankForContext(
      experiences,
      { strategy: 'discovery', signals: disabled },
      'recommended',
      { now: FIXED_NOW, limit: 3 },
    );

    expect(ranked.every((item) => item.explanation.weightedScore === 0)).toBe(true);
    expect(
      ranked.every(
        (item) =>
          item.score === item.explanation.weightedScore + item.explanation.diversityAdjustment,
      ),
    ).toBe(true);
  });

  it('rejects invalid publication timestamps from Recently Launched', () => {
    const experience = experiences[0];

    if (!experience) throw new Error('Expected an experience fixture.');

    const invalid = { ...experience, publishedAt: 'not-a-date' };

    expect(getEligibility('recently-launched', invalid, FIXED_NOW).eligible).toBe(false);
  });

  it('sanitizes non-finite configured weights before normalization', () => {
    const malformed = DEFAULT_RANKING_CONFIGURATION.signals.map((signal, index) => ({
      ...signal,
      weight: index === 0 ? Number.NaN : Number.POSITIVE_INFINITY,
    }));
    const normalized = normalizeSignals(malformed);

    expect(normalized.every((signal) => Number.isFinite(signal.weight))).toBe(true);
    expect(normalized.reduce((sum, signal) => sum + signal.weight, 0)).toBe(100);
  });

  it('rejects future publication timestamps from every discovery context', () => {
    const experience = experiences[0];

    if (!experience) throw new Error('Expected an experience fixture.');

    const future = { ...experience, publishedAt: '2026-11-22T00:00:00.000Z' };
    const contexts = [
      'featured',
      'trending',
      'recommended',
      'hidden-gems',
      'recently-launched',
    ] as const;

    for (const context of contexts) {
      expect(getEligibility(context, future, FIXED_NOW).eligible).toBe(false);
    }
  });

  it('rejects malformed metric records before scoring', () => {
    const experience = experiences[0];

    if (!experience) throw new Error('Expected an experience fixture.');

    const malformed = {
      ...experience,
      metrics: { ...experience.metrics, activePlayers: -1 },
    };

    expect(getEligibility('recommended', malformed, FIXED_NOW).eligible).toBe(false);
  });

  it('separates catalog retrieval from context eligibility', () => {
    const retrieved = retrieveCandidates(experiences, { genre: 'Horror' });
    const eligible = filterEligibleCandidates(retrieved, 'trending', FIXED_NOW);

    expect(retrieved.length).toBeGreaterThan(0);
    expect(eligible.every((item) => (item.metrics.weeklyChange ?? 0) > 0)).toBe(true);
    expect(
      eligible.every(
        (item) =>
          item.genre === 'Horror' ||
          item.tags.includes('Horror') ||
          item.subgenre.toLowerCase().includes('horror'),
      ),
    ).toBe(true);
  });

  it('applies context multipliers before normalizing effective weights', () => {
    const trending = rankForContext(experiences, DEFAULT_RANKING_CONFIGURATION, 'trending', {
      now: FIXED_NOW,
    })[0];
    const recommended = rankForContext(experiences, DEFAULT_RANKING_CONFIGURATION, 'recommended', {
      now: FIXED_NOW,
    })[0];

    expect(trending).toBeDefined();
    expect(recommended).toBeDefined();

    if (!trending || !recommended) throw new Error('Expected context ranking fixtures.');

    const trendingRelevance = trending.explanation.signals.find(
      (signal) => signal.id === 'relevance',
    );
    const recommendedRelevance = recommended.explanation.signals.find(
      (signal) => signal.id === 'relevance',
    );

    expect(trendingRelevance?.effectiveWeight).toBeGreaterThan(
      recommendedRelevance?.effectiveWeight ?? 0,
    );
  });
});
