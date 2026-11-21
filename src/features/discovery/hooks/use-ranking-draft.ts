import { useMemo, useState } from 'react';
import { experiences } from '@/data/mocks/experiences';
import { featuredExperience } from '@/data/mocks/catalog';
import {
  createPreset,
  rankExperiences,
  toggleSignal,
  updateSignalWeight,
  type RankingConfiguration,
  type RankingSignalId,
} from '@/features/discovery/engine/ranking';

const candidates = experiences.filter((experience) => experience.id !== featuredExperience.id);

function getGenreDistribution(items: ReturnType<typeof rankExperiences>) {
  const buckets = new Map<string, number>();

  for (const item of items) {
    const genre = item.experience.genre;
    const label =
      genre === 'Horror'
        ? 'Horror'
        : genre === 'Action RPG'
          ? 'Action / RPG'
          : genre === 'Simulation'
            ? 'Simulation'
            : genre === 'Exploration'
              ? 'Adventure'
              : genre;

    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }

  return [...buckets.entries()]
    .map(
      ([label, count]) => [label, Math.round((count / Math.max(1, items.length)) * 100)] as const,
    )
    .sort((a, b) => b[1] - a[1]);
}

export function useRankingDraft(configuration: RankingConfiguration) {
  const [draft, setDraft] = useState(configuration);
  const [mobileTab, setMobileTab] = useState<'signals' | 'preview'>('signals');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const preview = useMemo(() => rankExperiences(candidates, draft).slice(0, 5), [draft]);
  const baseline = useMemo(() => rankExperiences(candidates, configuration), [configuration]);
  const baselinePositions = useMemo(
    () => new Map(baseline.map((item) => [item.experience.id, item.position])),
    [baseline],
  );
  const totalWeight = draft.signals.reduce((sum, signal) => sum + signal.weight, 0);
  const distribution = useMemo(() => getGenreDistribution(preview), [preview]);

  function updateDraft(next: RankingConfiguration) {
    setDraft(next);
    setDirty(true);
  }

  function selectStrategy(strategy: Parameters<typeof createPreset>[0]) {
    updateDraft(createPreset(strategy));
  }

  function toggleDraftSignal(id: RankingSignalId, enabled: boolean) {
    setDraft((current) => ({
      ...current,
      signals: toggleSignal(current.signals, id, enabled),
    }));
    setDirty(true);
  }

  function updateDraftSignalWeight(id: RankingSignalId, weight: number) {
    setDraft((current) => ({
      ...current,
      signals: updateSignalWeight(current.signals, id, weight),
    }));
    setDirty(true);
  }

  function resetDraft() {
    updateDraft(createPreset('discovery'));
  }

  return {
    draft,
    dirty,
    mobileTab,
    setMobileTab,
    expandedId,
    setExpandedId,
    preview,
    baselinePositions,
    totalWeight,
    distribution,
    selectStrategy,
    toggleDraftSignal,
    updateDraftSignalWeight,
    resetDraft,
  };
}
