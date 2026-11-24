import type { Experience, ExperienceGenre } from '../../../types/experience';

export type RankingSignalId =
  'affinity' | 'quality' | 'relevance' | 'freshness' | 'popularity' | 'diversity';
export type RankingStrategyId = 'balanced' | 'popularity' | 'personalized' | 'discovery';
export type RankingContext =
  'featured' | 'trending' | 'recommended' | 'hidden-gems' | 'recently-launched';

export interface RankingSignal {
  id: RankingSignalId;
  label: string;
  description: string;
  weight: number;
  enabled: boolean;
}

export interface RankingConfiguration {
  strategy: RankingStrategyId;
  signals: RankingSignal[];
}

export interface RankingSignalExplanation {
  id: RankingSignalId;
  label: string;
  rawScore: number;
  normalizedScore: number;
  configuredWeight: number;
  contextMultiplier: number;
  effectiveWeight: number;
  contribution: number;
  enabled: boolean;
}

export interface RankingExplanation {
  context: RankingContext;
  strategy: RankingStrategyId;
  finalScore: number;
  weightedScore: number;
  diversityPenalty: number;
  diversityAdjustment: number;
  signals: RankingSignalExplanation[];
  eligibilityReasons: string[];
  reasons: string[];
}

export interface RankedExperience {
  experience: Experience;
  score: number;
  position: number;
  factors: Record<RankingSignalId, number>;
  explanation: RankingExplanation;
}

export interface RankingOptions {
  now?: Date;
  genre?: ExperienceGenre | 'All';
  limit?: number;
}

export const DEFAULT_RANKING_CONFIGURATION: RankingConfiguration = {
  strategy: 'discovery',
  signals: [
    {
      id: 'affinity',
      label: 'User affinity',
      description: "Alignment with the selected persona's preferred genres.",
      weight: 25,
      enabled: true,
    },
    {
      id: 'quality',
      label: 'Engagement quality',
      description: 'Positive-vote ratings and engagement indicators when available.',
      weight: 25,
      enabled: true,
    },
    {
      id: 'relevance',
      label: 'Relevance',
      description: 'Contextual alignment with interests and tags.',
      weight: 20,
      enabled: true,
    },
    {
      id: 'freshness',
      label: 'Freshness',
      description: 'Recently launched experiences and fresh updates.',
      weight: 10,
      enabled: true,
    },
    {
      id: 'popularity',
      label: 'Popularity',
      description: 'Current live player count.',
      weight: 10,
      enabled: true,
    },
    {
      id: 'diversity',
      label: 'Diversity',
      description: 'Variety across genres and experience types.',
      weight: 10,
      enabled: true,
    },
  ],
};

const PRESETS: Record<RankingStrategyId, number[]> = {
  balanced: [20, 20, 20, 10, 20, 10],
  popularity: [5, 20, 10, 5, 50, 10],
  personalized: [40, 25, 20, 5, 5, 5],
  discovery: [25, 25, 20, 10, 10, 10],
};

const CONTEXT_MULTIPLIERS: Record<RankingContext, Record<RankingSignalId, number>> = {
  featured: {
    affinity: 1.2,
    quality: 1.3,
    relevance: 1.2,
    freshness: 0.8,
    popularity: 0.8,
    diversity: 0.8,
  },
  trending: {
    affinity: 1.2,
    quality: 1,
    relevance: 1.5,
    freshness: 0.8,
    popularity: 0.5,
    diversity: 0.7,
  },
  recommended: {
    affinity: 1,
    quality: 1,
    relevance: 1,
    freshness: 1,
    popularity: 1,
    diversity: 1,
  },
  'hidden-gems': {
    affinity: 1.3,
    quality: 1.3,
    relevance: 1.3,
    freshness: 0.8,
    popularity: 0.25,
    diversity: 1.1,
  },
  'recently-launched': {
    affinity: 1.2,
    quality: 1,
    relevance: 1.3,
    freshness: 0.7,
    popularity: 0.5,
    diversity: 1,
  },
};

export const DISCOVERY_POLICY = {
  featured: { minimumRating: 85, minimumVotes: 100 },
  trending: { minimumWeeklyChange: 0 },
  hiddenGems: { maximumActivePlayers: 10_000, minimumRating: 88 },
  recentlyLaunched: { maximumAgeDays: 30 },
} as const;

const DAY_MS = 86_400_000;
const MAX_DIVERSITY_PENALTY = 8;
const clamp = (value: number, min = 0, max = 1) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
const safeWeight = (weight: number) => (Number.isFinite(weight) ? Math.max(0, weight) : 0);
const compareIds = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

function distributeIntegerWeights<T extends { id: RankingSignalId; weight: number }>(
  items: T[],
  totalWeight: number,
): Map<RankingSignalId, number> {
  if (items.length === 0) return new Map();

  const total = items.reduce((sum, item) => sum + safeWeight(item.weight), 0);
  const shares = items.map((item) => {
    const exact =
      total > 0 ? (safeWeight(item.weight) / total) * totalWeight : totalWeight / items.length;

    return {
      id: item.id,
      weight: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });
  const remaining = totalWeight - shares.reduce((sum, share) => sum + share.weight, 0);

  shares.sort((a, b) => b.remainder - a.remainder || compareIds(a.id, b.id));

  for (const share of shares.slice(0, remaining)) share.weight += 1;

  return new Map(shares.map((share) => [share.id, share.weight]));
}

export function normalizeSignals(signals: RankingSignal[]): RankingSignal[] {
  const enabled = signals.filter((signal) => signal.enabled);

  if (enabled.length === 0) return signals.map((signal) => ({ ...signal, weight: 0 }));

  const normalized = distributeIntegerWeights(enabled, 100);

  return signals.map((signal) => ({
    ...signal,
    weight: signal.enabled ? (normalized.get(signal.id) ?? 0) : 0,
  }));
}

export function updateSignalWeight(
  signals: RankingSignal[],
  id: RankingSignalId,
  nextWeight: number,
): RankingSignal[] {
  const enabled = signals.filter((signal) => signal.enabled);

  if (!enabled.some((signal) => signal.id === id)) return signals;

  if (enabled.length === 1) {
    return signals.map((signal) => (signal.id === id ? { ...signal, weight: 100 } : signal));
  }

  const bounded = Math.round(clamp(nextWeight, 0, 100));
  const redistributed = distributeIntegerWeights(
    enabled.filter((signal) => signal.id !== id),
    100 - bounded,
  );

  return signals.map((signal) => {
    if (!signal.enabled) return { ...signal, weight: 0 };

    if (signal.id === id) return { ...signal, weight: bounded };

    return { ...signal, weight: redistributed.get(signal.id) ?? 0 };
  });
}

export function toggleSignal(
  signals: RankingSignal[],
  id: RankingSignalId,
  enabled: boolean,
): RankingSignal[] {
  return normalizeSignals(
    signals.map((signal) =>
      signal.id === id
        ? { ...signal, enabled, weight: enabled ? Math.max(signal.weight, 1) : 0 }
        : signal,
    ),
  );
}

export function createPreset(strategy: RankingStrategyId): RankingConfiguration {
  return {
    strategy,
    signals: DEFAULT_RANKING_CONFIGURATION.signals.map((signal, index) => ({
      ...signal,
      weight: PRESETS[strategy][index] ?? 0,
      enabled: true,
    })),
  };
}

function ageInDays(timestamp: string | undefined, now: Date): number {
  const parsed = Date.parse(timestamp ?? '');

  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;

  return (now.getTime() - parsed) / DAY_MS;
}

function resolveRankingClock(experiences: Experience[], requested?: Date): Date {
  if (requested) return requested;

  const reference = experiences
    .map((experience) => Date.parse(experience.freshnessReferenceAt ?? ''))
    .filter(Number.isFinite)
    .reduce((latest, value) => Math.max(latest, value), Number.NEGATIVE_INFINITY);

  return Number.isFinite(reference) ? new Date(reference) : new Date();
}

export function getEligibility(
  context: RankingContext,
  experience: Experience,
  now: Date,
): { eligible: boolean; reasons: string[] } {
  const age = ageInDays(experience.publishedAt, now);
  const publishedAt = Date.parse(experience.publishedAt ?? '');
  const optionalMetricIsValid = (
    value: number | undefined,
    min = 0,
    max = Number.POSITIVE_INFINITY,
  ) => value === undefined || (Number.isFinite(value) && value >= min && value <= max);
  const metricsValid =
    optionalMetricIsValid(experience.metrics.activePlayers) &&
    optionalMetricIsValid(experience.metrics.rating, 0, 100) &&
    optionalMetricIsValid(experience.metrics.reviewCount) &&
    optionalMetricIsValid(experience.metrics.voteCount) &&
    optionalMetricIsValid(experience.metrics.averagePlaytimeMinutes) &&
    optionalMetricIsValid(experience.metrics.weeklyChange, Number.NEGATIVE_INFINITY);

  if (!Number.isFinite(now.getTime())) {
    return { eligible: false, reasons: ['Ranking clock is invalid.'] };
  }

  if (!metricsValid) {
    return {
      eligible: false,
      reasons: ['Available experience metrics are outside valid ranges.'],
    };
  }

  if (Number.isFinite(publishedAt) && publishedAt > now.getTime()) {
    return { eligible: false, reasons: ['Publication timestamp is in the future.'] };
  }

  switch (context) {
    case 'featured': {
      const rating = experience.metrics.rating;
      const voteCount = experience.metrics.voteCount ?? experience.metrics.reviewCount;
      const hasRatingEvidence = rating !== undefined && voteCount !== undefined;
      const eligible = hasRatingEvidence
        ? rating >= DISCOVERY_POLICY.featured.minimumRating &&
          voteCount >= DISCOVERY_POLICY.featured.minimumVotes
        : experience.source?.provider === 'rotunnel';

      return {
        eligible,
        reasons: hasRatingEvidence
          ? [
              `Rating ${rating.toFixed(1)}% (threshold: ${DISCOVERY_POLICY.featured.minimumRating}%).`,
              `${voteCount.toLocaleString()} votes (threshold: ${DISCOVERY_POLICY.featured.minimumVotes}).`,
            ]
          : [
              'Rating evidence unavailable; eligibility inherited from the native Roblox discovery feed.',
            ],
      };
    }
    case 'trending': {
      const weeklyChange = experience.metrics.weeklyChange;
      const hasMomentum = weeklyChange !== undefined;
      const eligible = hasMomentum
        ? weeklyChange > DISCOVERY_POLICY.trending.minimumWeeklyChange
        : experience.source?.provider === 'rotunnel';

      return {
        eligible,
        reasons: hasMomentum
          ? [`${weeklyChange.toFixed(1)}% week-over-week player momentum.`]
          : [
              `Native Roblox feed: ${experience.source?.sortId ?? 'unknown'}; weekly change is not publicly available.`,
            ],
      };
    }
    case 'recommended':
      return {
        eligible: true,
        reasons: ['Eligible live Roblox candidate; no additional section threshold.'],
      };
    case 'hidden-gems': {
      const activePlayers = experience.metrics.activePlayers;
      const rating = experience.metrics.rating;
      const hasPlayerCount = activePlayers !== undefined;
      const hasRating = rating !== undefined;
      const eligible =
        hasPlayerCount &&
        activePlayers <= DISCOVERY_POLICY.hiddenGems.maximumActivePlayers &&
        (!hasRating || rating >= DISCOVERY_POLICY.hiddenGems.minimumRating);

      return {
        eligible,
        reasons: [
          hasPlayerCount
            ? `${activePlayers.toLocaleString()} active players (ceiling: ${DISCOVERY_POLICY.hiddenGems.maximumActivePlayers.toLocaleString()}).`
            : 'Active-player count unavailable; cannot verify hidden-gem eligibility.',
          hasRating
            ? `Rating ${rating.toFixed(1)}% (threshold: ${DISCOVERY_POLICY.hiddenGems.minimumRating}%).`
            : 'Rating unavailable; no rating threshold applied.',
        ],
      };
    }
    case 'recently-launched':
      return {
        eligible:
          Number.isFinite(publishedAt) &&
          age >= 0 &&
          age <= DISCOVERY_POLICY.recentlyLaunched.maximumAgeDays,
        reasons: [
          Number.isFinite(age)
            ? `Published ${age.toFixed(1)} days ago (window: 0–${DISCOVERY_POLICY.recentlyLaunched.maximumAgeDays} days).`
            : 'Publication date unavailable; cannot verify recently-launched eligibility.',
        ],
      };
  }
}


/**
 * One-sided 95% Wilson lower confidence bound for a positive-vote proportion.
 * A lower bound is intentionally used instead of the raw percentage so a
 * perfect score from a handful of votes is not treated like a well-supported
 * rating from thousands of votes. Inputs and output are proportions [0, 1].
 */
function wilsonLowerBound(rating: number, voteCount: number): number {
  if (!Number.isFinite(voteCount) || voteCount <= 0) return clamp(rating);

  const z = 1.96;
  const zSquared = z * z;
  const n = voteCount;
  const p = clamp(rating);
  const denominator = 1 + zSquared / n;
  const center = p + zSquared / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + zSquared / (4 * n)) / n);

  return clamp((center - margin) / denominator);
}

function rawSignals(
  experience: Experience,
  genreFrequency: number,
  catalogSize: number,
  now: Date,
  hasPersona: boolean,
): Record<RankingSignalId, number> {
  const launchAge = ageInDays(experience.publishedAt, now);
  const updateAge = ageInDays(experience.updatedAt, now);
  const launchFreshness =
    Number.isFinite(launchAge) && launchAge >= 0 ? Math.exp(-launchAge / 180) : 0;
  const updateFreshness =
    Number.isFinite(updateAge) && updateAge >= 0 ? Math.exp(-updateAge / 60) : 0;
  const match = experience.matchScore === undefined ? 0 : clamp(experience.matchScore / 100);
  const rating =
    experience.metrics.rating === undefined ? 0 : clamp(experience.metrics.rating / 100);
  const playtime = clamp((experience.metrics.averagePlaytimeMinutes ?? 0) / 60);
  const hasSyntheticEngagement =
    experience.metrics.d7Retention !== undefined && experience.metrics.repeatPlayRate !== undefined;
  const retention = clamp(
    (experience.metrics.d1Retention ?? 0.35) * 0.25 +
      (experience.metrics.d7Retention ?? 0.2) * 0.5 +
      (experience.metrics.d30Retention ?? 0.1) * 0.25,
  );
  const repeatPlay = clamp(experience.metrics.repeatPlayRate ?? 0.4);
  const session = clamp(
    (experience.metrics.averageSessionMinutes ?? experience.metrics.averagePlaytimeMinutes ?? 0) /
      60,
  );
  const hasRating = experience.metrics.rating !== undefined;
  const hasPlaytime = experience.metrics.averagePlaytimeMinutes !== undefined;
  const voteCount = experience.metrics.voteCount ?? experience.metrics.reviewCount;
  const ratingConfidence =
    hasRating && voteCount !== undefined && voteCount > 0
      ? wilsonLowerBound(rating, voteCount)
      : rating;
  const quality = hasSyntheticEngagement
    ? clamp(rating * 0.35 + playtime * 0.2 + retention * 0.25 + repeatPlay * 0.15 + session * 0.05)
    : hasRating && hasPlaytime
      ? clamp(ratingConfidence * 0.65 + playtime * 0.35)
      : hasRating
        ? ratingConfidence
        : playtime;
  const activePlayers = experience.metrics.activePlayers;
  const popularity =
    activePlayers === undefined ? 0 : clamp(Math.log10(Math.max(0, activePlayers) + 1) / 5);

  return {
    affinity: hasPersona ? match : 0,
    quality,
    relevance: hasPersona ? clamp(experience.personaRelevanceScore ?? 0) : 0,
    freshness: clamp(Math.max(launchFreshness, updateFreshness * 0.75)),
    popularity,
    diversity: clamp(1 - Math.max(0, genreFrequency - 1) / Math.max(1, catalogSize - 1)),
  };
}

function hasSignalData(
  experience: Experience,
  signal: RankingSignalId,
  hasPersona: boolean,
): boolean {
  switch (signal) {
    case 'affinity':
      return hasPersona && experience.matchScore !== undefined;
    case 'quality':
      return (
        experience.metrics.rating !== undefined ||
        experience.metrics.averagePlaytimeMinutes !== undefined ||
        (experience.metrics.d7Retention !== undefined &&
          experience.metrics.repeatPlayRate !== undefined)
      );
    case 'relevance':
      return hasPersona && experience.personaRelevanceScore !== undefined;
    case 'freshness':
      return (
        Number.isFinite(Date.parse(experience.publishedAt ?? '')) ||
        Number.isFinite(Date.parse(experience.updatedAt ?? ''))
      );
    case 'popularity':
      return experience.metrics.activePlayers !== undefined;
    case 'diversity':
      return true;
  }
}

function buildScoredCandidates(
  items: Experience[],
  configuration: RankingConfiguration,
  context: RankingContext,
  now: Date,
  hasPersona: boolean,
): RankedExperience[] {
  const signals = normalizeSignals(configuration.signals);
  const multipliers = CONTEXT_MULTIPLIERS[context];
  const genreFrequency = new Map<string, number>();

  for (const experience of items) {
    genreFrequency.set(experience.genre, (genreFrequency.get(experience.genre) ?? 0) + 1);
  }

  return items.map((experience) => {
    const available = signals.map((signal) => {
      const active = signal.enabled && hasSignalData(experience, signal.id, hasPersona);

      return {
        ...signal,
        active,
        effective: active ? signal.weight * multipliers[signal.id] : 0,
      };
    });
    const effectiveTotal = available.reduce((sum, signal) => sum + signal.effective, 0);
    const weights = new Map<RankingSignalId, number>(
      available.map((signal) => [
        signal.id,
        effectiveTotal > 0 ? signal.effective / effectiveTotal : 0,
      ]),
    );
    const raw = rawSignals(
      experience,
      genreFrequency.get(experience.genre) ?? 1,
      items.length,
      now,
      hasPersona,
    );
    const signalsExplanation = available.map((signal) => {
      const effectiveWeight = weights.get(signal.id) ?? 0;
      const normalizedScore = raw[signal.id] * 100;

      return {
        id: signal.id,
        label: signal.label,
        rawScore: raw[signal.id],
        normalizedScore,
        configuredWeight: signal.weight / 100,
        contextMultiplier: multipliers[signal.id],
        effectiveWeight,
        contribution: normalizedScore * effectiveWeight,
        enabled: signal.active,
      };
    });
    const factors = Object.fromEntries(
      signalsExplanation.map((signal) => [signal.id, signal.contribution]),
    ) as Record<RankingSignalId, number>;
    const score = signalsExplanation.reduce((sum, signal) => sum + signal.contribution, 0);
    const eligibility = getEligibility(context, experience, now);
    const reasons = signalsExplanation
      .filter((signal) => signal.enabled && signal.contribution >= 12)
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3)
      .map((signal) => `${signal.label} contributed ${signal.contribution.toFixed(1)} points.`);

    return {
      experience,
      score,
      factors,
      position: 0,
      explanation: {
        context,
        strategy: configuration.strategy,
        finalScore: score,
        weightedScore: score,
        diversityPenalty: 0,
        diversityAdjustment: 0,
        signals: signalsExplanation,
        eligibilityReasons: eligibility.reasons,
        reasons,
      },
    };
  });
}

function compareRanked(a: RankedExperience, b: RankedExperience): number {
  return b.score - a.score || compareIds(a.experience.id, b.experience.id);
}

function getHeapItem(heap: RankedExperience[], index: number): RankedExperience {
  const item = heap[index];

  if (!item) throw new Error(`Ranking heap invariant violated at index ${index}.`);

  return item;
}

function getDiversityStrength(
  configuration: RankingConfiguration,
  context: RankingContext,
): number {
  const configured = normalizeSignals(configuration.signals);
  const contextMultipliers = CONTEXT_MULTIPLIERS[context];
  const effectiveTotal = configured.reduce(
    (sum, signal) => sum + (signal.enabled ? signal.weight * contextMultipliers[signal.id] : 0),
    0,
  );
  const diversity = configured.find((signal) => signal.id === 'diversity');

  if (!diversity?.enabled || diversity.weight <= 0 || effectiveTotal <= 0) return 0;

  const effectiveShare = (diversity.weight * contextMultipliers.diversity) / effectiveTotal;

  const baseline = normalizeSignals(DEFAULT_RANKING_CONFIGURATION.signals);
  const baselineTotal = baseline.reduce(
    (sum, signal) => sum + signal.weight * contextMultipliers[signal.id],
    0,
  );
  const baselineDiversity = baseline.find((signal) => signal.id === 'diversity');
  const baselineShare =
    baselineTotal > 0 && baselineDiversity
      ? (baselineDiversity.weight * contextMultipliers.diversity) / baselineTotal
      : 0;

  return baselineShare > 0 ? clamp(effectiveShare / baselineShare, 0, 2.5) : 0;
}

function selectTopCandidates(
  candidates: RankedExperience[],
  count: number,
  diversityPenaltyBudget = MAX_DIVERSITY_PENALTY,
): RankedExperience[] {
  if (count >= candidates.length) return [...candidates].sort(compareRanked);

  if (count <= 0) return [];

  const heap: RankedExperience[] = [];
  const siftDown = (startIndex: number) => {
    let index = startIndex;

    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let worst = index;

      if (
        left < heap.length &&
        compareRanked(getHeapItem(heap, worst), getHeapItem(heap, left)) < 0
      )
        worst = left;

      if (
        right < heap.length &&
        compareRanked(getHeapItem(heap, worst), getHeapItem(heap, right)) < 0
      )
        worst = right;

      if (worst === index) return;

      const current = getHeapItem(heap, index);
      const replacement = getHeapItem(heap, worst);

      heap[index] = replacement;
      heap[worst] = current;
      index = worst;
    }
  };

  for (const candidate of candidates) {
    if (heap.length < count) {
      heap.push(candidate);
      let index = heap.length - 1;

      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);

        if (compareRanked(getHeapItem(heap, parent), getHeapItem(heap, index)) >= 0) break;

        const parentItem = getHeapItem(heap, parent);
        const currentItem = getHeapItem(heap, index);

        heap[parent] = currentItem;
        heap[index] = parentItem;
        index = parent;
      }
    } else if (compareRanked(candidate, getHeapItem(heap, 0)) < 0) {
      heap[0] = candidate;
      siftDown(0);
    }
  }

  heap.sort(compareRanked);
  const threshold = (heap[heap.length - 1]?.score ?? 0) - diversityPenaltyBudget;
  const selectedIds = new Set(heap.map((candidate) => candidate.experience.id));
  const diversityCandidates = candidates.filter(
    (candidate) => candidate.score >= threshold && !selectedIds.has(candidate.experience.id),
  );

  return [...heap, ...diversityCandidates].sort(compareRanked);
}

function candidateSimilarity(
  left: Experience,
  right: Experience,
  tagSets: Map<string, Set<string>>,
): number {
  const leftTags = tagSets.get(left.id) ?? new Set<string>();
  const rightTags = tagSets.get(right.id) ?? new Set<string>();
  let intersection = 0;

  for (const tag of leftTags) {
    if (rightTags.has(tag)) intersection += 1;
  }

  const union = leftTags.size + rightTags.size - intersection;
  const tagSimilarity = union > 0 ? intersection / union : 0;

  const genreSimilarity =
    left.genreConfidence === 'unknown' ||
    left.genreConfidence === 'low' ||
    right.genreConfidence === 'unknown' ||
    right.genreConfidence === 'low'
      ? 0
      : left.genre === right.genre
        ? 0.55
        : 0;

  return clamp(genreSimilarity + tagSimilarity * 0.45);
}

function rerankForDiversity(
  candidates: RankedExperience[],
  limit: number,
  diversityStrength: number,
): RankedExperience[] {
  if (diversityStrength <= 0) {
    return candidates
      .slice(0, limit)
      .sort(compareRanked)
      .map((item, index) => ({ ...item, position: index + 1 }));
  }

  const remaining = [...candidates];
  const selected: RankedExperience[] = [];
  const tagSets = new Map(
    candidates.map((candidate) => [
      candidate.experience.id,
      new Set(
        candidate.experience.tags
          .map((tag) => tag.trim().toLocaleLowerCase('en'))
          // Genre is already scored independently below. Keeping the inferred genre
          // in tags would count the same evidence twice (0.55 + 0.45 = 1.0).
          .filter(
            (tag) =>
              tag &&
              tag !== candidate.experience.genre.toLocaleLowerCase('en') &&
              // Roblox's broad top-level category adds little gameplay evidence.
              // Keep specific metadata (for example, FPS) in the similarity set.
              !['all', 'unknown', 'none', 'n/a', 'na', 'other', 'town and city'].includes(tag),
          ),
      ),
    ]),
  );

  while (remaining.length && selected.length < limit) {
    let bestIndex = 0;
    let bestAdjustment = 0;
    let bestAdjustedScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];

      if (!candidate) continue;

      const maxSimilarity = selected.reduce(
        (max, item) =>
          Math.max(max, candidateSimilarity(item.experience, candidate.experience, tagSets)),
        0,
      );
      const adjustment =
        selected.length === 0 ? 0 : -MAX_DIVERSITY_PENALTY * diversityStrength * maxSimilarity;
      const adjustedScore = candidate.score + adjustment;
      const currentBestId = remaining[bestIndex]?.experience.id ?? '';

      if (
        adjustedScore > bestAdjustedScore ||
        (adjustedScore === bestAdjustedScore &&
          candidate.experience.id.localeCompare(currentBestId) < 0)
      ) {
        bestAdjustedScore = adjustedScore;
        bestAdjustment = adjustment;
        bestIndex = index;
      }
    }

    const [chosen] = remaining.splice(bestIndex, 1);

    if (!chosen) continue;

    const diversityAdjustment = Math.max(-chosen.score, bestAdjustment);
    const finalScore = chosen.score + diversityAdjustment;

    selected.push({
      ...chosen,
      score: finalScore,
      explanation: {
        ...chosen.explanation,
        finalScore,
        diversityPenalty: bestAdjustment,
        diversityAdjustment,
      },
    });
  }

  return selected.map((item, index) => ({ ...item, position: index + 1 }));
}

export function retrieveCandidates(
  catalog: Experience[],
  options: Pick<RankingOptions, 'genre'> = {},
): Experience[] {
  return catalog.filter((experience) => {
    const genre = options.genre;

    return (
      genre === undefined ||
      genre === 'All' ||
      experience.genre === genre ||
      experience.tags.includes(genre) ||
      experience.subgenre.toLocaleLowerCase().includes(genre.toLocaleLowerCase())
    );
  });
}

export function filterEligibleCandidates(
  candidates: Experience[],
  context: RankingContext,
  now: Date,
): Experience[] {
  return candidates.filter((experience) => getEligibility(context, experience, now).eligible);
}

export function rankForContext(
  experiences: Experience[],
  configuration: RankingConfiguration,
  context: RankingContext,
  options: RankingOptions = {},
): RankedExperience[] {
  const now = resolveRankingClock(experiences, options.now);
  const retrieved = retrieveCandidates(experiences, options);
  const eligible = filterEligibleCandidates(retrieved, context, now);
  // Persona selection belongs to the ranking request, not the filtered candidate subset.
  // A context may legitimately exclude every game carrying an individual match score.
  const hasPersona = experiences.some((experience) => experience.matchScore !== undefined);
  const scored = buildScoredCandidates(eligible, configuration, context, now, hasPersona);
  const limit = options.limit ?? scored.length;
  const diversityStrength = getDiversityStrength(configuration, context);
  const candidatePoolSize = Math.min(
    scored.length,
    diversityStrength <= 0 || limit <= 1 ? limit : Math.max(limit, limit * 8),
  );
  const candidatePool = selectTopCandidates(
    scored,
    candidatePoolSize,
    MAX_DIVERSITY_PENALTY * diversityStrength,
  );

  return rerankForDiversity(candidatePool, limit, diversityStrength);
}

export function rankExperiences(
  experiences: Experience[],
  configuration: RankingConfiguration,
  now?: Date,
): RankedExperience[] {
  const rankingClock = resolveRankingClock(experiences, now);
  const hasPersona = experiences.some((experience) => experience.matchScore !== undefined);
  const scored = buildScoredCandidates(
    experiences,
    configuration,
    'recommended',
    rankingClock,
    hasPersona,
  );
  const diversityStrength = getDiversityStrength(configuration, 'recommended');

  return rerankForDiversity(
    selectTopCandidates(scored, scored.length, MAX_DIVERSITY_PENALTY * diversityStrength),
    scored.length,
    diversityStrength,
  );
}

export function isDefaultRankingConfiguration(configuration: RankingConfiguration): boolean {
  return (
    configuration.strategy === DEFAULT_RANKING_CONFIGURATION.strategy &&
    configuration.signals.length === DEFAULT_RANKING_CONFIGURATION.signals.length &&
    configuration.signals.every((signal, index) => {
      const baseline = DEFAULT_RANKING_CONFIGURATION.signals[index];

      return (
        baseline !== undefined &&
        signal.id === baseline.id &&
        signal.weight === baseline.weight &&
        signal.enabled === baseline.enabled
      );
    })
  );
}
