import type { Experience } from '@/types/experience';

export type RankingSignalId =
  'affinity' | 'quality' | 'relevance' | 'freshness' | 'popularity' | 'diversity';
export type RankingStrategyId = 'balanced' | 'popularity' | 'personalized' | 'discovery';

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

export interface RankedExperience {
  experience: Experience;
  score: number;
  position: number;
  factors: Record<RankingSignalId, number>;
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function distributeIntegerWeights<T extends { id: RankingSignalId; weight: number }>(
  items: T[],
  totalWeight: number,
): Map<RankingSignalId, number> {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  const shares = items.map((item) => {
    const exact =
      total > 0 ? (Math.max(0, item.weight) / total) * totalWeight : totalWeight / items.length;

    return { id: item.id, weight: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  const remaining = totalWeight - shares.reduce((sum, share) => sum + share.weight, 0);

  shares.sort((a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id));

  for (const share of shares.slice(0, remaining)) {
    share.weight += 1;
  }

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
  const target = enabled.find((signal) => signal.id === id);

  if (!target) return signals;

  if (enabled.length === 1)
    return signals.map((signal) => (signal.id === id ? { ...signal, weight: 100 } : signal));

  const bounded = clamp(Math.round(nextWeight), 0, 100);
  const others = enabled.filter((signal) => signal.id !== id);
  const redistributed = distributeIntegerWeights(others, 100 - bounded);

  return signals.map((signal) => {
    if (!signal.enabled) return { ...signal, weight: 0 };

    return signal.id === id
      ? { ...signal, weight: bounded }
      : { ...signal, weight: redistributed.get(signal.id) ?? 0 };
  });
}

export function toggleSignal(
  signals: RankingSignal[],
  id: RankingSignalId,
  enabled: boolean,
): RankingSignal[] {
  const next = signals.map((signal) =>
    signal.id === id
      ? { ...signal, enabled, weight: enabled ? Math.max(signal.weight, 1) : 0 }
      : signal,
  );

  return normalizeSignals(next);
}

export function createPreset(strategy: RankingStrategyId): RankingConfiguration {
  const weights = PRESETS[strategy];

  return {
    strategy,
    signals: DEFAULT_RANKING_CONFIGURATION.signals.map((signal, index) => ({
      ...signal,
      weight: weights[index] ?? 0,
      enabled: true,
    })),
  };
}

function getRawFactors(
  experience: Experience,
  genreFrequency: number,
  catalogSize: number,
): Record<RankingSignalId, number> {
  const referenceTime = Date.parse('2026-11-21T00:00:00.000Z');
  const ageDays = Math.max(
    0,
    (referenceTime - new Date(experience.publishedAt).getTime()) / 86_400_000,
  );
  const match = (experience.matchScore ?? 72) / 100;
  const quality = experience.metrics.rating / 100;
  const playtime = clamp(experience.metrics.averagePlaytimeMinutes / 60, 0, 1);
  const popularity = clamp(Math.log10(experience.metrics.activePlayers + 1) / 5, 0, 1);

  return {
    affinity: clamp(match * 0.78 + (experience.tags.length / 20) * 0.22, 0, 1),
    quality: clamp(quality * 0.65 + playtime * 0.35, 0, 1),
    relevance: clamp(match * 0.7 + (experience.description.length / 500) * 0.3, 0, 1),
    freshness: Math.exp(-ageDays / 180),
    popularity,
    diversity: clamp(1 - genreFrequency / Math.max(1, catalogSize), 0, 1),
  };
}

export function rankExperiences(
  experiences: Experience[],
  configuration: RankingConfiguration,
): RankedExperience[] {
  const weights = normalizeSignals(configuration.signals);
  const weightMap = Object.fromEntries(
    weights.map((signal) => [signal.id, signal.weight / 100]),
  ) as Record<RankingSignalId, number>;
  const genreFrequency = new Map<string, number>();

  for (const experience of experiences) {
    genreFrequency.set(experience.genre, (genreFrequency.get(experience.genre) ?? 0) + 1);
  }

  return experiences
    .map((experience) => {
      const raw = getRawFactors(
        experience,
        genreFrequency.get(experience.genre) ?? 1,
        experiences.length,
      );
      const factors = Object.fromEntries(
        Object.entries(raw).map(([key, value]) => [
          key,
          value * weightMap[key as RankingSignalId] * 100,
        ]),
      ) as Record<RankingSignalId, number>;
      const score = Object.values(factors).reduce((sum, value) => sum + value, 0);

      return { experience, score, factors, position: 0 };
    })
    .sort((a, b) => b.score - a.score || a.experience.id.localeCompare(b.experience.id))
    .map((item, index) => ({ ...item, position: index + 1 }));
}
