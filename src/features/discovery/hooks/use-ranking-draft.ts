import { useMemo, useState } from 'react';
import {
  createPreset,
  toggleSignal,
  updateSignalWeight,
  type RankingConfiguration,
  type RankingSignalId,
  type RankingStrategyId,
} from '@/features/discovery/engine/ranking';

export function useRankingDraft(configuration: RankingConfiguration) {
  const [draft, setDraft] = useState(configuration);
  const [dirty, setDirty] = useState(false);
  const totalWeight = useMemo(
    () => draft.signals.reduce((sum, signal) => sum + signal.weight, 0),
    [draft.signals],
  );

  function selectStrategy(strategy: RankingStrategyId) {
    setDraft(createPreset(strategy));
    setDirty(true);
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
    setDraft(createPreset('discovery'));
    setDirty(true);
  }

  function discardDraft() {
    setDraft(configuration);
    setDirty(false);
  }

  return {
    draft,
    dirty,
    totalWeight,
    selectStrategy,
    toggleDraftSignal,
    updateDraftSignalWeight,
    resetDraft,
    discardDraft,
  };
}
