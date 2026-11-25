import type { ExperienceGenre } from '../../types/experience';

export type GenreConfidence = 'high' | 'medium' | 'low' | 'unknown';

export interface GenreClassification {
  genre: ExperienceGenre;
  confidence: GenreConfidence;
  /** Meaningful provider taxonomy value, when one was supplied. */
  nativeGenre?: string;
}

const GENERIC_LABELS = new Set([
  'all',
  'unknown',
  'none',
  'n/a',
  'na',
  'other',
  'unclassified',
  '',
]);

export function meaningfulLabel(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().replace(/\s+/g, ' ');

  if (!normalized || GENERIC_LABELS.has(normalized.toLocaleLowerCase('en'))) return undefined;

  return normalized;
}

export function firstMeaningfulLabel(...values: unknown[]): string | undefined {
  for (const value of values) {
    const label = meaningfulLabel(value);

    if (label) return label;
  }

  return undefined;
}

const NATIVE_GENRES: ReadonlyArray<{ pattern: RegExp; genre: ExperienceGenre }> = [
  { pattern: /^(?:horror|scary)$/i, genre: 'Horror' },
  { pattern: /^(?:co.?op|cooperative|survival(?:\s+games?)?)$/i, genre: 'Co-op' },
  { pattern: /^(?:racing|driving|motorsports?)$/i, genre: 'Racing' },
  { pattern: /^(?:fps|shooter|fighting|combat)$/i, genre: 'Action RPG' },
  { pattern: /^(?:role.?play|town and city|building|simulation)$/i, genre: 'Simulation' },
  { pattern: /^(?:obby|puzzle)$/i, genre: 'Puzzle' },
  { pattern: /^(?:adventure|exploration)$/i, genre: 'Exploration' },
];

interface Rule {
  genre: ExperienceGenre;
  pattern: RegExp;
  title: number;
  description: number;
}

// This is a small product taxonomy, not general-purpose language understanding.
// Prefer specific game mechanics over incidental words in long descriptions.
const RULES: readonly Rule[] = [
  {
    genre: 'Horror',
    pattern:
      /\b(?:mascot horror|analog horror|psychological horror|horror|scary|haunted|haunting|survival horror)\b/i,
    title: 7,
    description: 5,
  },
  {
    genre: 'Horror',
    pattern:
      /\b(?:don't let it hear|dont let it hear|hide from (?:the )?monster|monster is hunting|something is hunting|survive the call|phone is ringing)\b/i,
    title: 5,
    description: 3,
  },
  {
    genre: 'Racing',
    pattern:
      /\b(?:racing|race track|racetrack|drift|motorsport|karting|rally|downhill biking|bike racing)\b/i,
    title: 7,
    description: 4,
  },
  {
    genre: 'Racing',
    pattern:
      /\b(?:dirt bike|motorcycle|motorbike|bikelife|ski racing|time trial|race against other riders)\b/i,
    title: 5,
    description: 3,
  },
  {
    genre: 'Racing',
    pattern: /\b(?:car crash physics|crash physics|vehicle crash simulator)\b/i,
    title: 3,
    description: 4,
  },
  {
    genre: 'Racing',
    pattern:
      /\b(?:kart racing|kart racer|drag rac(?:e|ing)s?|street racing|car racing|vehicle racing|race cars?|race track|lap time|time trial|speedway|finish line|racing game|driving game)\b/i,
    title: 6,
    description: 4,
  },
  { genre: 'Racing', pattern: /\bdriving simulator\b/i, title: 5, description: 3 },
  {
    genre: 'Action RPG',
    pattern:
      /\b(?:first.?person shooter|fps|sniper|gunplay|deathmatch|team deathmatch|shooter|shooters|melee combat|combat|fighter|fighting|battle|warfare|kamikaze|assassin|heist)\b/i,
    title: 6,
    description: 4,
  },
  {
    genre: 'Action RPG',
    pattern:
      /\b(?:drone|weapon|guns?|sword|punch|kick|attack|powers per kill|per kill|defeat ragdolls|killstreak|voxel wars|arena combat)\b/i,
    title: 4,
    description: 2,
  },
  {
    genre: 'Action RPG',
    pattern:
      /\b(?:rpg|role.?playing|anime crusaders|anime speed|evolution|evolve|evolving|boss fight|bosses|rob (?:the )?vault|robbery|stealth game|fling arena)\b/i,
    title: 5,
    description: 3,
  },
  {
    genre: 'Action RPG',
    pattern:
      /\b(?:last one standing|last player alive|battle royale|survive deadly disasters|punch,? and don't get hit)\b/i,
    title: 4,
    description: 3,
  },
  {
    genre: 'Puzzle',
    pattern:
      /\b(?:chess|board game|puzzle|obby|escape room|brain teaser|unscrew|geometry dash|draw the meme|name them all|trivia|quiz game)\b/i,
    title: 7,
    description: 4,
  },
  {
    genre: 'Puzzle',
    pattern:
      /\b(?:build a bridge|solve puzzles|solve riddles|logic game|word game|drawing competition|block tower)\b/i,
    title: 5,
    description: 3,
  },
  {
    genre: 'Simulation',
    pattern:
      /\b(?:emergency services|emergency response|police|firefighter|paramedic|ambulance|city roleplay|city rp|roleplay|role.?play)\b/i,
    title: 5,
    description: 4,
  },
  {
    genre: 'Simulation',
    pattern:
      /\b(?:simulator|simulation|tycoon|building|factory|business|card opening|card collecting|collecting simulator|physics sandbox|sandbox|ragdoll physics|crash test dummies)\b/i,
    title: 5,
    description: 3,
  },
  {
    genre: 'Simulation',
    pattern:
      /\b(?:build a car|build (?:your|a) world|build (?:a )?house|vehicle building|car meets|car collection|plane landing|land the plane|flying jobs|pilot)\b/i,
    title: 5,
    description: 3,
  },
  {
    genre: 'Simulation',
    pattern:
      /\b(?:collect (?:rare )?(?:animals|pets|fish)|catch (?:rare )?fish|cast your line|fishing|raise pets|grow (?:bigger|stronger)|clean(?:ing)? (?:the )?(?:ballpit|up)|attract and collect|collect baddies|farm|harvest)\b/i,
    title: 4,
    description: 3,
  },
  {
    genre: 'Simulation',
    pattern:
      /\b(?:dig the mountain|mining|vacuum up stones|streamer simulator|be the biggest streamer|delivery game|deliver parcels|delivery streaks|plane crash(?:ing)?|aircraft crash|scare the streamer|steal their package|offroad|4x4|rock crawling|soccer physics|volley bomb|sports game)\b/i,
    title: 5,
    description: 3,
  },
  {
    genre: 'Co-op',
    pattern:
      /\b(?:co.?op|cooperative|party game|hangout|social deduction|team up|play together|work together)\b/i,
    title: 6,
    description: 4,
  },
  {
    genre: 'Co-op',
    pattern:
      /\b(?:survival (?:island|world|game)|island survival|survive the wilderness|wilderness survival|zombie survival|wave survival|gather resources|craft (?:tools|weapons|shelter)|hunger and thirst|base building|build a shelter|day and night cycle|scavenge for supplies|defend your base)\b/i,
    title: 6,
    description: 4,
  },
  {
    genre: 'Exploration',
    pattern:
      /\b(?:adventure|exploration|open world|quest|explore new islands|explore the forest|raft(?:ing)?|voyage|skiing|surfing|creature survival|ocean|underwater|treasure|wildlife|hunting)\b/i,
    title: 4,
    description: 3,
  },
];

export function classifyGenre(input: {
  nativeGenre?: unknown;
  title: string;
  description: string;
}): GenreClassification {
  const nativeGenre = meaningfulLabel(input.nativeGenre);

  if (nativeGenre) {
    const nativeMatch = NATIVE_GENRES.find(({ pattern }) => pattern.test(nativeGenre));

    if (nativeMatch) {
      return { genre: nativeMatch.genre, confidence: 'high', nativeGenre };
    }
  }

  const title = input.title;
  const description = input.description.slice(0, 1_200);
  const scores = new Map<ExperienceGenre, number>();

  for (const rule of RULES) {
    const titleMatch = rule.pattern.test(title);
    const descriptionMatch = rule.pattern.test(description);
    const score = (titleMatch ? rule.title : 0) + (descriptionMatch ? rule.description : 0);

    if (score > 0) scores.set(rule.genre, (scores.get(rule.genre) ?? 0) + score);
  }

  const ranked = [...scores.entries()].sort((left, right) => right[1] - left[1]);
  const winner = ranked[0];
  const runnerUp = ranked[1];

  if (!winner || winner[1] < 3) {
    return { genre: 'Exploration', confidence: 'unknown', ...(nativeGenre ? { nativeGenre } : {}) };
  }

  const margin = winner[1] - (runnerUp?.[1] ?? 0);
  const confidence: GenreConfidence =
    winner[1] >= 7 && margin >= 3 ? 'high' : winner[1] >= 4 && margin >= 2 ? 'medium' : 'low';

  return { genre: winner[0], confidence, ...(nativeGenre ? { nativeGenre } : {}) };
}
