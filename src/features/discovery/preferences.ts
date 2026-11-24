import { useCallback, useSyncExternalStore } from 'react';
import { isRankingConfiguration, isRankingStrategy } from '@/config/discovery';
import {
  DEFAULT_RANKING_CONFIGURATION,
  type RankingConfiguration,
} from './engine/ranking';

const STORAGE_KEY = 'discover:preferences:v1';
const CHANGE_EVENT = 'discover:preferences-change';

export interface DiscoveryPreferences {
  version: 1;
  personaId: string | null;
  ranking: RankingConfiguration;
}

const DEFAULT_PREFERENCES: DiscoveryPreferences = {
  version: 1,
  personaId: null,
  ranking: DEFAULT_RANKING_CONFIGURATION,
};

let cachedPreferences = DEFAULT_PREFERENCES;

function parsePreferences(raw: string | null): DiscoveryPreferences {
  if (!raw) return DEFAULT_PREFERENCES;

  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_PREFERENCES;

    const candidate = value as Record<string, unknown>;
    const ranking = candidate.ranking;
    if (
      candidate.version !== 1 ||
      !(candidate.personaId === null || typeof candidate.personaId === 'string') ||
      !ranking ||
      typeof ranking !== 'object' ||
      Array.isArray(ranking)
    ) {
      return DEFAULT_PREFERENCES;
    }

    const configuration = ranking as Record<string, unknown>;
    if (
      !isRankingStrategy(configuration.strategy) ||
      !isRankingConfiguration(configuration.signals)
    ) {
      return DEFAULT_PREFERENCES;
    }

    const storedSignals = configuration.signals as Array<{
      id: string;
      weight: number;
      enabled: boolean;
    }>;

    return {
      version: 1,
      personaId: candidate.personaId as string | null,
      ranking: {
        strategy: configuration.strategy,
        signals: DEFAULT_RANKING_CONFIGURATION.signals.map((defaultSignal) => {
          const stored = storedSignals.find((signal) => signal.id === defaultSignal.id);
          return {
            ...defaultSignal,
            enabled: stored?.enabled ?? defaultSignal.enabled,
            weight: stored?.weight ?? defaultSignal.weight,
          };
        }),
      },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function getSnapshot(): DiscoveryPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  try {
    const next = parsePreferences(window.localStorage.getItem(STORAGE_KEY));
    if (JSON.stringify(next) !== JSON.stringify(cachedPreferences)) cachedPreferences = next;
  } catch {
    // Retain the last valid in-memory preferences if storage is unavailable.
  }

  return cachedPreferences;
}

function getServerSnapshot(): DiscoveryPreferences {
  return DEFAULT_PREFERENCES;
}

function subscribe(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    getSnapshot();
    onChange();
  };
  const handleLocalChange = () => onChange();

  window.addEventListener('storage', handleStorage);
  window.addEventListener(CHANGE_EVENT, handleLocalChange);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(CHANGE_EVENT, handleLocalChange);
  };
}

export function useDiscoveryPreferences() {
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updatePreferences = useCallback(
    (updater: (current: DiscoveryPreferences) => DiscoveryPreferences) => {
      const next = updater(getSnapshot());
      if (JSON.stringify(next) === JSON.stringify(cachedPreferences)) return;

      cachedPreferences = next;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // The in-memory preference state remains usable without storage access.
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [],
  );

  return { preferences, updatePreferences };
}
