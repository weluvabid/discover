import type { ExperienceGenre } from '../../types/experience';

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

/** Deterministic persona affinity based on declared genre preferences. */
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

export function seedPersonas() {
  return PERSONAS.map(([id, label, description, preferences]) => ({
    id,
    label,
    description,
    preferences: [...preferences],
  }));
}
