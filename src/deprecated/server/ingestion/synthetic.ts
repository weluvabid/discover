import type { ExperienceGenre } from '@/types/experience';
import { calculatePersonaMatchScore, PERSONAS } from '../../../domain/personas/personas';
export {
  calculatePersonaMatchScore,
  calculatePersonaRelevanceScore,
  PERSONAS,
  seedPersonas,
} from '../../../domain/personas/personas';
export type { PersonaId } from '../../../domain/personas/personas';

export interface SyntheticMetrics {
  averageSessionMinutes: number;
  averagePlaytimeMinutes: number;
  d1Retention: number;
  d7Retention: number;
  d30Retention: number;
  repeatPlayRate: number;
  weeklyChange: number;
  matchScores: Record<string, number>;
}


function hash32(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
  }

  return hash >>> 0;
}

function randomFor(seed: number, salt: string): () => number {
  let state = (seed ^ hash32(salt)) >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const GENRE_AFFINITY: Record<string, ExperienceGenre[]> = {
  'Action RPG': ['Action RPG'],
  Exploration: ['Exploration'],
  'Co-op': ['Co-op', 'Exploration'],
  Action: ['Action RPG'],
  'Sports & Racing': ['Racing'],
  'Obby & Platformer': ['Puzzle', 'Racing'],
  'Roleplay & Avatar Sim': ['Co-op', 'Simulation'],
  'Party & Casual': ['Co-op', 'Puzzle'],
  Shopping: ['Simulation'],
  Survival: ['Horror', 'Co-op'],
  Shooter: ['Action RPG'],
  RPG: ['Action RPG'],
  Adventure: ['Exploration', 'Action RPG'],
  Simulation: ['Simulation'],
  Strategy: ['Puzzle', 'Simulation'],
  Horror: ['Horror'],
  Puzzle: ['Puzzle'],
  Racing: ['Racing'],
  Fighting: ['Action RPG'],
  Other: ['Exploration', 'Simulation'],
};

export function generateSyntheticMetrics(input: {
  universeId: string;
  genre: string;
  sourceActivePlayers: number;
  rating: number;
  seed: number;
}): SyntheticMetrics {
  const random = randomFor(input.seed, input.universeId);
  const quality = clamp((input.rating - 50) / 50, 0.05, 1);
  const demand = clamp(Math.log10(input.sourceActivePlayers + 1) / 5, 0, 1);
  const genre = GENRE_AFFINITY[input.genre] ? input.genre : 'Other';

  const averageSessionMinutes =
    Math.round(clamp((10 + quality * 24 + demand * 8) * (0.82 + random() * 0.36), 4, 90) * 10) / 10;
  const averagePlaytimeMinutes =
    Math.round(averageSessionMinutes * (1.25 + quality * 0.85) * 10) / 10;
  const d1Retention = clamp(
    0.12 + quality * 0.23 + demand * 0.08 + (random() - 0.5) * 0.06,
    0.05,
    0.55,
  );
  const d7Retention = clamp(
    d1Retention * (0.43 + quality * 0.13) + (random() - 0.5) * 0.025,
    0.02,
    d1Retention,
  );
  const d30Retention = clamp(
    d7Retention * (0.38 + quality * 0.12) + (random() - 0.5) * 0.015,
    0.005,
    d7Retention,
  );
  const repeatPlayRate = clamp(
    d1Retention * 0.48 + d7Retention * 0.34 + quality * 0.12 + random() * 0.08,
    0.03,
    0.85,
  );
  const weeklyChange =
    Math.round(clamp((quality - 0.55) * 42 + (random() - 0.48) * 70, -65, 180) * 10) / 10;
  const matchScores = Object.fromEntries(
    PERSONAS.map(([id, , , preferences]) => [
      id,
      calculatePersonaMatchScore(genre as ExperienceGenre, preferences),
    ]),
  );

  return {
    averageSessionMinutes,
    averagePlaytimeMinutes,
    d1Retention,
    d7Retention,
    d30Retention,
    repeatPlayRate,
    weeklyChange,
    matchScores,
  };
}

