import type { ExperienceGenre } from '@/types/experience';

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

export const PERSONAS = [
  [
    'competitive',
    'Competitive climber',
    'Prioritizes mastery, ranked play and short repeatable sessions',
    ['Action RPG', 'Racing'],
  ],
  [
    'social',
    'Social explorer',
    'Prefers co-op, roleplay and shared experiences',
    ['Co-op', 'Exploration'],
  ],
  [
    'builder',
    'Creative builder',
    'Enjoys construction, simulation and sandbox systems',
    ['Simulation', 'Puzzle'],
  ],
  [
    'thrill-seeker',
    'Thrill seeker',
    'Looks for horror, survival and high-tension experiences',
    ['Horror', 'Co-op'],
  ],
  [
    'completionist',
    'Completionist',
    'Likes progression, collections and long-term goals',
    ['Action RPG', 'Simulation'],
  ],
  [
    'casual',
    'Casual browser',
    'Prefers approachable experiences and low commitment',
    ['Puzzle', 'Racing'],
  ],
  [
    'story-first',
    'Story seeker',
    'Values narrative, atmosphere and exploration',
    ['Exploration', 'Horror'],
  ],
  [
    'speedrunner',
    'Speedrunner',
    'Optimizes routes, movement and repeat attempts',
    ['Racing', 'Action RPG'],
  ],
  [
    'tactician',
    'Tactician',
    'Prefers planning, strategy and systems depth',
    ['Puzzle', 'Simulation'],
  ],
  [
    'adventurer',
    'Open-world adventurer',
    'Explores broad worlds and emergent activities',
    ['Exploration', 'Action RPG'],
  ],
  [
    'party-player',
    'Party player',
    'Looks for quick social sessions and variety',
    ['Co-op', 'Racing'],
  ],
  [
    'collector',
    'Collector',
    'Enjoys collecting, trading and incremental progression',
    ['Simulation', 'Action RPG'],
  ],
] as const;

export type PersonaId = (typeof PERSONAS)[number][0];

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

const RELATED_GENRES: Record<ExperienceGenre, ExperienceGenre[]> = {
  'Action RPG': ['Racing', 'Exploration'],
  Exploration: ['Co-op', 'Horror', 'Action RPG'],
  'Co-op': ['Exploration', 'Simulation'],
  Racing: ['Action RPG', 'Puzzle'],
  Horror: ['Exploration', 'Co-op'],
  Simulation: ['Puzzle', 'Co-op'],
  Puzzle: ['Simulation', 'Racing'],
};

const PERSONA_KEYWORDS: Record<string, string[]> = {
  competitive: ['ranked', 'competitive', 'arena', 'duel', 'battle', 'versus', 'pvp', 'fighter'],
  social: ['roleplay', 'hangout', 'party', 'friends', 'social', 'town', 'club', 'chat'],
  builder: [
    'build',
    'builder',
    'tycoon',
    'sandbox',
    'design',
    'create',
    'house',
    'farm',
    'factory',
    'restaurant',
  ],
  'thrill-seeker': ['horror', 'scary', 'survival', 'escape', 'monster', 'nightmare', 'haunted'],
  completionist: [
    'quest',
    'level',
    'progression',
    'dungeon',
    'campaign',
    'achievement',
    'boss',
    'adventure',
  ],
  casual: ['obby', 'easy', 'party', 'casual', 'minigame', 'mini-game', 'puzzle', 'simulator'],
  'story-first': [
    'story',
    'storyline',
    'narrative',
    'chapter',
    'quest',
    'adventure',
    'mystery',
    'exploration',
  ],
  speedrunner: [
    'speedrun',
    'race',
    'racing',
    'obby',
    'parkour',
    'time trial',
    'checkpoint',
    'fast',
  ],
  tactician: [
    'strategy',
    'tactical',
    'tower defense',
    'defense',
    'chess',
    'command',
    'war',
    'squad',
    'turn-based',
  ],
  adventurer: [
    'open world',
    'explore',
    'adventure',
    'island',
    'expedition',
    'survival',
    'quest',
    'world',
  ],
  'party-player': [
    'party',
    'minigame',
    'mini-game',
    'round',
    'friends',
    'social',
    'race',
    'competition',
  ],
  collector: [
    'pet',
    'collect',
    'collection',
    'trade',
    'trading',
    'egg',
    'card',
    'creature',
    'inventory',
    'hatch',
    'adopt',
  ],
};

/** Deterministic persona affinity based on declared genre preferences and rating. */
export function calculatePersonaMatchScore(
  genre: ExperienceGenre,
  preferences: readonly ExperienceGenre[],
): number {
  const direct = preferences.includes(genre);
  const adjacent = (RELATED_GENRES[genre] ?? []).some((candidate) =>
    preferences.includes(candidate),
  );

  return direct ? 84 : adjacent ? 58 : 28;
}

/**
 * Measures persona-specific topical alignment without rewarding description length.
 * Each keyword contributes at most once, with stronger evidence in titles and taxonomy.
 */
export function calculatePersonaRelevanceScore(
  personaId: string,
  input: {
    title: string;
    description: string;
    subgenre: string;
    tags: readonly string[];
  },
): number {
  const keywords = PERSONA_KEYWORDS[personaId] ?? [];

  if (keywords.length === 0) return 0;

  const fields = [
    { value: input.title, weight: 1 },
    { value: input.subgenre, weight: 0.85 },
    { value: input.tags.join(' '), weight: 0.75 },
    { value: input.description, weight: 0.45 },
  ];
  let score = 0;

  for (const keyword of keywords) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
    const strongestMatch = fields.reduce(
      (best, field) => (pattern.test(field.value) ? Math.max(best, field.weight) : best),
      0,
    );

    score += strongestMatch;
  }

  // Two strong topical matches saturate the signal; repeated prose cannot inflate it.
  return Math.round(clamp(score / 2, 0, 1) * 100) / 100;
}

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

export function seedPersonas() {
  return PERSONAS.map(([id, label, description, preferences]) => ({
    id,
    label,
    description,
    preferences: [...preferences],
  }));
}
