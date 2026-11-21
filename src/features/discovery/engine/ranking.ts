import type { Experience, ExperienceGenre } from '@/types/experience';

export type RankingSignalId =
  | 'affinity'
  | 'quality'
  | 'relevance'
  | 'freshness'
  | 'popularity'
  | 'diversity';
export type RankingStrategyId = 'balanced' | 'popularity' | 'personalized' | 'discovery';
export type RankingContext =
  | 'featured'
  | 'trending'
  | 'recommended'
  | 'hidden-gems'
  | 'recently-launched';

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
      description: 'Match score against personal play habits and genres.',
      weight: 25,
      enabled: true,
    },
    {
      id: 'quality',
      label: 'Engagement quality',
      description: 'Session length, ratings and repeat-play signals.',
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
      description: 'Current active players and sustained demand.',
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
  featured: { minimumRating: 85, minimumReviews: 100 },
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
    const exact = total > 0 ? (safeWeight(item.weight) / total) * totalWeight : totalWeight / items.length;
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

function ageInDays(experience: Experience, now: Date): number {
  const published = Date.parse(experience.publishedAt);
  if (!Number.isFinite(published)) return Number.POSITIVE_INFINITY;
  return (now.getTime() - published) / DAY_MS;
}

export function getEligibility(
  context: RankingContext,
  experience: Experience,
  now: Date,
): { eligible: boolean; reasons: string[] } {
  const age = ageInDays(experience, now);
  const publishedAt = Date.parse(experience.publishedAt);
  const metricsValid =
    Number.isFinite(experience.metrics.activePlayers) &&
    experience.metrics.activePlayers >= 0 &&
    Number.isFinite(experience.metrics.rating) &&
    experience.metrics.rating >= 0 &&
    experience.metrics.rating <= 100 &&
    Number.isFinite(experience.metrics.reviewCount) &&
    experience.metrics.reviewCount >= 0 &&
    Number.isFinite(experience.metrics.averagePlaytimeMinutes) &&
    experience.metrics.averagePlaytimeMinutes >= 0 &&
    (experience.metrics.weeklyChange === undefined ||
      Number.isFinite(experience.metrics.weeklyChange));

  if (!Number.isFinite(now.getTime())) {
    return { eligible: false, reasons: ['Ranking clock is invalid.'] };
  }
  if (!Number.isFinite(publishedAt) || publishedAt > now.getTime()) {
    return { eligible: false, reasons: ['Publication timestamp is invalid or in the future.'] };
  }
  if (!metricsValid) {
    return { eligible: false, reasons: ['Required experience metrics are missing or outside valid ranges.'] };
  }

  switch (context) {
    case 'featured':
      return {
        eligible:
          experience.metrics.rating >= DISCOVERY_POLICY.featured.minimumRating &&
          experience.metrics.reviewCount >= DISCOVERY_POLICY.featured.minimumReviews,
        reasons: [
          `Rating ${experience.metrics.rating}% (threshold: ${DISCOVERY_POLICY.featured.minimumRating}%).`,
          `${experience.metrics.reviewCount.toLocaleString()} reviews (threshold: ${DISCOVERY_POLICY.featured.minimumReviews}).`,
        ],
      };
    case 'trending':
      return {
        eligible:
          (experience.metrics.weeklyChange ?? 0) > DISCOVERY_POLICY.trending.minimumWeeklyChange,
        reasons: [`${experience.metrics.weeklyChange ?? 0}% week-over-week player momentum.`],
      };
    case 'recommended':
      return {
        eligible: true,
        reasons: ['Eligible general-catalog candidate; no additional section threshold.'],
      };
    case 'hidden-gems':
      return {
        eligible:
          experience.metrics.activePlayers <= DISCOVERY_POLICY.hiddenGems.maximumActivePlayers &&
          experience.metrics.rating >= DISCOVERY_POLICY.hiddenGems.minimumRating,
        reasons: [
          `${experience.metrics.activePlayers.toLocaleString()} active players (ceiling: ${DISCOVERY_POLICY.hiddenGems.maximumActivePlayers.toLocaleString()}).`,
          `Rating ${experience.metrics.rating}% (threshold: ${DISCOVERY_POLICY.hiddenGems.minimumRating}%).`,
        ],
      };
    case 'recently-launched':
      return {
        eligible: age >= 0 && age <= DISCOVERY_POLICY.recentlyLaunched.maximumAgeDays,
        reasons: [
          `Published ${Number.isFinite(age) ? age.toFixed(1) : 'an unknown number of'} days ago (window: 0–${DISCOVERY_POLICY.recentlyLaunched.maximumAgeDays} days).`,
        ],
      };
  }
}

function rawSignals(
  experience: Experience,
  genreFrequency: number,
  catalogSize: number,
  now: Date,
): Record<RankingSignalId, number> {
  const age = ageInDays(experience, now);
  const match = clamp((experience.matchScore ?? 72) / 100);
  const quality = clamp(experience.metrics.rating / 100);
  const playtime = clamp(experience.metrics.averagePlaytimeMinutes / 60);
  const popularity = clamp(Math.log10(Math.max(0, experience.metrics.activePlayers) + 1) / 5);
  const tags = clamp(experience.tags.length / 12);

  return {
    affinity: clamp(match * 0.78 + tags * 0.22),
    quality: clamp(quality * 0.65 + playtime * 0.35),
    relevance: clamp(match * 0.7 + clamp(experience.description.length / 500) * 0.3),
    freshness: Number.isFinite(age) ? clamp(Math.exp(-age / 180)) : 0,
    popularity,
    diversity: clamp(1 - Math.max(0, genreFrequency - 1) / Math.max(1, catalogSize - 1)),
  };
}

function buildScoredCandidates(
  items: Experience[],
  configuration: RankingConfiguration,
  context: RankingContext,
  now: Date,
): RankedExperience[] {
  const signals = normalizeSignals(configuration.signals);
  const multipliers = CONTEXT_MULTIPLIERS[context];
  const weighted = signals.map((signal) => ({
    ...signal,
    effective: signal.enabled ? signal.weight * multipliers[signal.id] : 0,
  }));
  const effectiveTotal = weighted.reduce((sum, signal) => sum + signal.effective, 0);
  const weights = new Map<RankingSignalId, number>(
    weighted.map((signal) => [signal.id, effectiveTotal > 0 ? signal.effective / effectiveTotal : 0]),
  );
  const genreFrequency = new Map<string, number>();

  for (const experience of items) {
    genreFrequency.set(experience.genre, (genreFrequency.get(experience.genre) ?? 0) + 1);
  }

  return items
    .map((experience) => {
      const raw = rawSignals(
        experience,
        genreFrequency.get(experience.genre) ?? 1,
        items.length,
        now,
      );
      const signalsExplanation = signals.map((signal) => {
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
          enabled: signal.enabled,
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

function selectTopCandidates(
  candidates: RankedExperience[],
  count: number,
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

      if (left < heap.length && compareRanked(heap[worst]!, heap[left]!) < 0) worst = left;
      if (right < heap.length && compareRanked(heap[worst]!, heap[right]!) < 0) worst = right;
      if (worst === index) return;

      [heap[index], heap[worst]] = [heap[worst]!, heap[index]!];
      index = worst;
    }
  };

  for (const candidate of candidates) {
    if (heap.length < count) {
      heap.push(candidate);
      let index = heap.length - 1;
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        if (compareRanked(heap[parent]!, heap[index]!) >= 0) break;
        [heap[parent], heap[index]] = [heap[index]!, heap[parent]!];
        index = parent;
      }
    } else if (compareRanked(candidate, heap[0]!) < 0) {
      heap[0] = candidate;
      siftDown(0);
    }
  }

  heap.sort(compareRanked);
  const threshold = (heap[heap.length - 1]?.score ?? 0) - MAX_DIVERSITY_PENALTY;
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
  return clamp((left.genre === right.genre ? 0.55 : 0) + tagSimilarity * 0.45);
}

function rerankForDiversity(candidates: RankedExperience[], limit: number): RankedExperience[] {
  const remaining = [...candidates];
  const selected: RankedExperience[] = [];
  const tagSets = new Map(
    candidates.map((candidate) => [
      candidate.experience.id,
      new Set(candidate.experience.tags.map((tag) => tag.toLowerCase())),
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
      const adjustment = selected.length === 0 ? 0 : -MAX_DIVERSITY_PENALTY * maxSimilarity;
      const adjustedScore = candidate.score + adjustment;
      const currentBestId = remaining[bestIndex]?.experience.id ?? '';

      if (
        adjustedScore > bestAdjustedScore ||
        (adjustedScore === bestAdjustedScore && candidate.experience.id.localeCompare(currentBestId) < 0)
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
  const now = options.now ?? new Date();
  const retrieved = retrieveCandidates(experiences, options);
  const eligible = filterEligibleCandidates(retrieved, context, now);
  const scored = buildScoredCandidates(eligible, configuration, context, now);
  const limit = options.limit ?? scored.length;
  const candidatePoolSize = Math.min(
    scored.length,
    limit <= 1 ? limit : Math.max(limit, limit * 8),
  );
  const candidatePool = selectTopCandidates(scored, candidatePoolSize);

  return rerankForDiversity(candidatePool, limit);
}

export function rankExperiences(
  experiences: Experience[],
  configuration: RankingConfiguration,
  now = new Date(),
): RankedExperience[] {
  const scored = buildScoredCandidates(experiences, configuration, 'recommended', now);
  return rerankForDiversity(selectTopCandidates(scored, scored.length), scored.length);
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
