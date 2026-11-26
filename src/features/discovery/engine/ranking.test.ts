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

  it('uses query relevance as an independent ranking signal without a persona', () => {
    const [base] = experiences;

    if (!base) throw new Error('Expected a ranking fixture.');

    const candidates = [
      { ...base, id: 'exact', queryRelevanceScore: 1 },
      { ...base, id: 'weak', queryRelevanceScore: 0.2 },
    ];
    const configuration = {
      strategy: 'balanced' as const,
      signals: DEFAULT_RANKING_CONFIGURATION.signals.map((signal) => ({
        ...signal,
        enabled: signal.id === 'relevance',
        weight: signal.id === 'relevance' ? 100 : 0,
      })),
    };
    const ranked = rankForContext(candidates, configuration, 'recommended', {
      limit: 2,
      now: FIXED_NOW,
    });

    expect(ranked[0]?.experience.id).toBe('exact');
    expect(
      ranked[0]?.explanation.signals.find((signal) => signal.id === 'relevance'),
    ).toMatchObject({ enabled: true, normalizedScore: 100 });
  });

  it('orders the diversity-selected set by the final displayed score', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected a ranking fixture.');

    const candidates = Array.from({ length: 12 }, (_, index) => ({
      ...fixture,
      id: `diversity-order-${index}`,
      title: `Diversity order ${index}`,
      tags: index < 8 ? ['shared-gameplay-tag'] : [`unique-tag-${index}`],
    }));
    const ranked = rankForContext(candidates, DEFAULT_RANKING_CONFIGURATION, 'recommended', {
      limit: candidates.length,
      now: FIXED_NOW,
    });

    expect(ranked.map((item) => item.score)).toEqual(
      [...ranked.map((item) => item.score)].sort((left, right) => right - left),
    );
    expect(ranked.map((item) => item.position)).toEqual(
      ranked.map((_, index) => index + 1),
    );
    expect(
      ranked.every(
        (item) => item.score === item.explanation.finalScore,
      ),
    ).toBe(true);
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
    expect(ranked[0]?.factors.relevance).toBe(ranked[1]?.factors.relevance);
  });

  it('ranks persona-specific topical matches through relevance independently of affinity', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const strongTopic = {
      ...fixture,
      id: 'strong-topic',
      matchScore: 84,
      personaRelevanceScore: 1,
    };
    const weakTopic = {
      ...fixture,
      id: 'weak-topic',
      matchScore: 84,
      personaRelevanceScore: 0,
    };
    const ranked = rankForContext(
      [weakTopic, strongTopic],
      DEFAULT_RANKING_CONFIGURATION,
      'recommended',
      { now: FIXED_NOW, limit: 2 },
    );

    expect(ranked[0]?.experience.id).toBe('strong-topic');
    expect(ranked[0]?.factors.affinity).toBe(ranked[1]?.factors.affinity);
    expect(ranked[0]?.factors.relevance).toBeGreaterThan(ranked[1]?.factors.relevance ?? 0);
  });

  it('makes zero diversity weight disable both the rarity signal and greedy reranking', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const candidates = Array.from({ length: 6 }, (_, index) => ({
      ...fixture,
      id: `same-genre-${index}`,
      title: `Same genre ${index}`,
      matchScore: undefined,
      personaRelevanceScore: undefined,
      tags: ['shared', 'same'],
    }));
    const configuration = {
      ...DEFAULT_RANKING_CONFIGURATION,
      signals: updateSignalWeight(DEFAULT_RANKING_CONFIGURATION.signals, 'diversity', 0),
    };
    const ranked = rankExperiences(candidates, configuration, FIXED_NOW);

    expect(ranked.every((item) => item.explanation.diversityPenalty === 0)).toBe(true);
    expect(ranked.every((item) => item.factors.diversity === 0)).toBe(true);
  });

  it('does not use low-confidence inferred genres for greedy similarity penalties', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const first = {
      ...fixture,
      id: 'a-genre-reference',
      genre: 'Puzzle' as const,
      genreConfidence: 'high' as const,
      tags: [],
      matchScore: undefined,
      personaRelevanceScore: undefined,
    };
    const lowConfidence = {
      ...first,
      id: 'b-low-confidence',
      genreConfidence: 'low' as const,
    };
    const highConfidence = {
      ...first,
      id: 'b-high-confidence',
    };
    const lowRanked = rankExperiences(
      [first, lowConfidence],
      DEFAULT_RANKING_CONFIGURATION,
      FIXED_NOW,
    );
    const highRanked = rankExperiences(
      [first, highConfidence],
      DEFAULT_RANKING_CONFIGURATION,
      FIXED_NOW,
    );

    expect(
      lowRanked.find((item) => item.experience.id === lowConfidence.id)?.explanation
        .diversityPenalty,
    ).toBe(0);
    expect(
      highRanked.find((item) => item.experience.id === highConfidence.id)?.explanation
        .diversityPenalty,
    ).toBeLessThan(0);
  });

  it('does not count the inferred genre tag twice in diversity similarity', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const candidates = [
      {
        ...fixture,
        id: 'simulation-a',
        genre: 'Simulation' as const,
        genreConfidence: 'high' as const,
        tags: ['Simulation'],
        matchScore: undefined,
        personaRelevanceScore: undefined,
      },
      {
        ...fixture,
        id: 'simulation-b',
        genre: 'Simulation' as const,
        genreConfidence: 'high' as const,
        tags: ['Simulation'],
        matchScore: undefined,
        personaRelevanceScore: undefined,
      },
    ];
    const ranked = rankExperiences(candidates, DEFAULT_RANKING_CONFIGURATION, FIXED_NOW);
    const penalized = ranked.find((item) => item.experience.id !== ranked[0]?.experience.id);

    expect(penalized?.explanation.diversityPenalty).toBeCloseTo(-4.4, 6);
  });

  it('does not treat the broad Town and City category as semantic similarity', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const candidates = [
      {
        ...fixture,
        id: 'town-city-a',
        genre: 'Simulation' as const,
        genreConfidence: 'high' as const,
        tags: ['Town and City', 'Simulation'],
        matchScore: undefined,
        personaRelevanceScore: undefined,
      },
      {
        ...fixture,
        id: 'town-city-b',
        genre: 'Simulation' as const,
        genreConfidence: 'high' as const,
        tags: ['Town and City', 'Simulation'],
        matchScore: undefined,
        personaRelevanceScore: undefined,
      },
    ];
    const ranked = rankExperiences(candidates, DEFAULT_RANKING_CONFIGURATION, FIXED_NOW);
    const penalized = ranked.find((item) => item.experience.id !== ranked[0]?.experience.id);

    expect(penalized?.explanation.diversityPenalty).toBeCloseTo(-4.4, 6);
  });

  it('uses meaningful native metadata in addition to genre similarity', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const candidates = [
      {
        ...fixture,
        id: 'fps-a',
        genre: 'Action RPG' as const,
        genreConfidence: 'high' as const,
        tags: ['FPS', 'Action RPG'],
        matchScore: undefined,
        personaRelevanceScore: undefined,
      },
      {
        ...fixture,
        id: 'fps-b',
        genre: 'Action RPG' as const,
        genreConfidence: 'high' as const,
        tags: ['FPS', 'Action RPG'],
        matchScore: undefined,
        personaRelevanceScore: undefined,
      },
    ];
    const ranked = rankExperiences(candidates, DEFAULT_RANKING_CONFIGURATION, FIXED_NOW);
    const penalized = ranked.find((item) => item.experience.id !== ranked[0]?.experience.id);

    expect(penalized?.explanation.diversityPenalty).toBeCloseTo(-8, 6);
  });

  it('increases greedy reranking pressure when the diversity weight increases', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const candidates = Array.from({ length: 6 }, (_, index) => ({
      ...fixture,
      id: `same-genre-${index}`,
      title: `Same genre ${index}`,
      matchScore: undefined,
      personaRelevanceScore: undefined,
      tags: ['shared', 'same'],
    }));
    const lowDiversity = {
      ...DEFAULT_RANKING_CONFIGURATION,
      signals: updateSignalWeight(DEFAULT_RANKING_CONFIGURATION.signals, 'diversity', 5),
    };
    const highDiversity = {
      ...DEFAULT_RANKING_CONFIGURATION,
      signals: updateSignalWeight(DEFAULT_RANKING_CONFIGURATION.signals, 'diversity', 25),
    };
    const low = rankExperiences(candidates, lowDiversity, FIXED_NOW);
    const high = rankExperiences(candidates, highDiversity, FIXED_NOW);
    const penaltyTotal = (items: typeof low) =>
      items.reduce((sum, item) => sum + Math.abs(item.explanation.diversityPenalty), 0);

    expect(penaltyTotal(high)).toBeGreaterThan(penaltyTotal(low));
  });

  it('does not use description length as a relevance signal', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const concise = {
      ...fixture,
      matchScore: 90,
      personaRelevanceScore: 0.65,
      description: 'A concise description.',
    };
    const verbose = {
      ...concise,
      description: `A concise description. ${'Additional unrelated prose. '.repeat(100)}`,
    };
    const conciseRanked = rankExperiences([concise], DEFAULT_RANKING_CONFIGURATION, FIXED_NOW)[0];
    const verboseRanked = rankExperiences([verbose], DEFAULT_RANKING_CONFIGURATION, FIXED_NOW)[0];

    expect(verboseRanked?.factors.relevance).toBe(conciseRanked?.factors.relevance);
  });

  it('removes persona-only signal weights when no persona is selected', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const unpersonalized = {
      ...fixture,
      matchScore: undefined,
      personaRelevanceScore: undefined,
    };
    const ranked = rankExperiences([unpersonalized], DEFAULT_RANKING_CONFIGURATION, FIXED_NOW)[0];

    expect(ranked?.factors.affinity).toBe(0);
    expect(ranked?.factors.relevance).toBe(0);
    expect(ranked?.explanation.signals.find((signal) => signal.id === 'affinity')).toMatchObject({
      enabled: false,
      effectiveWeight: 0,
    });
    expect(ranked?.explanation.signals.find((signal) => signal.id === 'relevance')).toMatchObject({
      enabled: false,
      effectiveWeight: 0,
    });
  });

  it('uses vote-count confidence when scoring live rating-only quality', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const lowEvidence = {
      ...fixture,
      id: 'low-evidence-rating',
      metrics: { rating: 98, voteCount: 20 },
    };
    const strongEvidence = {
      ...fixture,
      id: 'strong-evidence-rating',
      metrics: { rating: 98, voteCount: 30_000 },
    };
    const ranked = rankForContext(
      [lowEvidence, strongEvidence],
      DEFAULT_RANKING_CONFIGURATION,
      'recommended',
      { now: FIXED_NOW, limit: 2 },
    );
    const lowQuality = ranked.find((item) => item.experience.id === lowEvidence.id)?.factors
      .quality;
    const strongQuality = ranked.find((item) => item.experience.id === strongEvidence.id)?.factors
      .quality;

    expect(strongQuality).toBeGreaterThan(lowQuality ?? 0);
  });

  it('keeps rating-only quality available when vote count is missing', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const experience = {
      ...fixture,
      metrics: { rating: 98 },
    };
    const ranked = rankForContext([experience], DEFAULT_RANKING_CONFIGURATION, 'recommended', {
      now: FIXED_NOW,
      limit: 1,
    })[0];

    expect(ranked?.factors.quality).toBeGreaterThan(0);
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
          (item.experience.metrics.activePlayers ?? Number.POSITIVE_INFINITY) <= 10_000 &&
          (item.experience.metrics.rating ?? -1) >= 88,
      ),
    ).toBe(true);
    expect(
      recent.every((item) => {
        const age =
          (FIXED_NOW.getTime() - Date.parse(item.experience.publishedAt ?? '')) / 86_400_000;

        return age >= 0 && age <= 30;
      }),
    ).toBe(true);
  });

  it('does not treat unavailable live telemetry as zero-valued ranking evidence', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const liveExperience = {
      ...fixture,
      publishedAt: undefined,
      updatedAt: undefined,
      metrics: { activePlayers: 1200 },
      source: { provider: 'rotunnel' as const, sortId: 'top-trending', nativePosition: 4 },
    };
    const ranked = rankForContext([liveExperience], DEFAULT_RANKING_CONFIGURATION, 'recommended', {
      now: FIXED_NOW,
      limit: 1,
    })[0];

    expect(ranked).toBeDefined();
    expect(ranked?.explanation.signals.find((signal) => signal.id === 'quality')).toMatchObject({
      enabled: false,
      effectiveWeight: 0,
    });
    expect(ranked?.explanation.signals.find((signal) => signal.id === 'freshness')).toMatchObject({
      enabled: false,
      effectiveWeight: 0,
    });
    expect(ranked?.explanation.signals.find((signal) => signal.id === 'popularity')?.enabled).toBe(
      true,
    );
  });

  it('uses the native feed when weekly growth is unavailable', () => {
    const fixture = experiences[0];

    if (!fixture) throw new Error('Expected an experience fixture.');

    const liveExperience = {
      ...fixture,
      metrics: { activePlayers: 1200 },
      source: { provider: 'rotunnel' as const, sortId: 'top-trending', nativePosition: 1 },
    };

    expect(getEligibility('trending', liveExperience, FIXED_NOW).eligible).toBe(true);
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

  it('keeps persona signals enabled when context filtering removes persona-scored games', () => {
    const eligibleWithoutPersonaScore = experiences.find(
      (experience) =>
        experience.matchScore === undefined &&
        getEligibility('trending', experience, FIXED_NOW).eligible,
    );
    const personaScoredButIneligible = experiences.find(
      (experience) => experience.matchScore !== undefined,
    );

    expect(eligibleWithoutPersonaScore).toBeDefined();
    expect(personaScoredButIneligible).toBeDefined();

    if (!eligibleWithoutPersonaScore || !personaScoredButIneligible) {
      throw new Error('Expected both persona-scored and unscored fixtures.');
    }

    const ranked = rankForContext(
      [
        eligibleWithoutPersonaScore,
        {
          ...personaScoredButIneligible,
          metrics: { ...personaScoredButIneligible.metrics, weeklyChange: -1 },
        },
      ],
      DEFAULT_RANKING_CONFIGURATION,
      'trending',
      { now: FIXED_NOW },
    )[0];

    expect(ranked).toBeDefined();
    const relevance = ranked?.explanation.signals.find((signal) => signal.id === 'relevance');

    expect(relevance).toMatchObject({ enabled: true });
    expect(relevance?.effectiveWeight).toBeGreaterThan(0);
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
