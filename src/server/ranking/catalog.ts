import type { DatabaseSync } from 'node:sqlite';
import type { Experience, ExperienceGenre } from '@/types/experience';
import { calculatePersonaMatchScore, seedPersonas } from '../ingestion/synthetic';

const PERSONA_PREFERENCES = new Map(seedPersonas().map((persona) => [persona.id, persona.preferences]));

const GENRES: ExperienceGenre[] = [
  'Action RPG',
  'Exploration',
  'Co-op',
  'Racing',
  'Horror',
  'Simulation',
  'Puzzle',
];

interface GameRow {
  universe_id: string;
  place_id: string;
  title: string;
  description: string;
  creator: string;
  creator_verified: number;
  genre: string;
  subgenre: string;
  tags_json: string;
  artwork_url: string;
  roblox_url: string;
  created_at: string | null;
  updated_at: string | null;
  source_updated_at: string | null;
  source_date_fetched: string | null;
  active_players: number;
  rating: number;
  review_count: number;
  average_playtime_minutes: number;
  weekly_change: number;
  average_session_minutes: number;
  d1_retention: number;
  d7_retention: number;
  d30_retention: number;
  repeat_play_rate: number;
  match_scores_json: string;
}

function mapGenre(value: string): ExperienceGenre {
  if (GENRES.includes(value as ExperienceGenre)) return value as ExperienceGenre;

  if (/horror|survival/i.test(value)) return 'Horror';

  if (/race|sport/i.test(value)) return 'Racing';

  if (/action|rpg|shooter|fight/i.test(value)) return 'Action RPG';

  if (/adventure|explor/i.test(value)) return 'Exploration';

  if (/roleplay|coop|co-op|party/i.test(value)) return 'Co-op';

  if (/puzzle|obby|platform/i.test(value)) return 'Puzzle';

  return 'Simulation';
}

function toExperience(row: GameRow, persona?: string, freshnessReferenceAt?: string): Experience {
  const tags = JSON.parse(row.tags_json || '[]') as string[];
  const matchScores = JSON.parse(row.match_scores_json || '{}') as Record<string, number>;

  return {
    id: row.universe_id,
    robloxUrl: row.roblox_url,
    title: row.title,
    description: row.description,
    creator: row.creator,
    creatorVerified: Boolean(row.creator_verified),
    genre: mapGenre(row.genre),
    subgenre: row.subgenre || row.genre,
    artwork: {
      thumbnail: row.artwork_url || '',
      alt: `${row.title} Roblox experience artwork`,
    },
    metrics: {
      activePlayers: row.active_players,
      rating: row.rating,
      reviewCount: row.review_count,
      averagePlaytimeMinutes: row.average_playtime_minutes,
      weeklyChange: row.weekly_change,
      averageSessionMinutes: row.average_session_minutes,
      d1Retention: row.d1_retention,
      d7Retention: row.d7_retention,
      d30Retention: row.d30_retention,
      repeatPlayRate: row.repeat_play_rate,
    },
    publishedAt: row.created_at ?? new Date(0).toISOString(),
    updatedAt: row.source_updated_at ?? row.updated_at ?? undefined,
    freshnessReferenceAt,
    tags: tags.length > 0 ? tags : [row.genre],
    matchScore: persona
      ? (() => {
          const preferences = PERSONA_PREFERENCES.get(persona);

          return preferences
            ? calculatePersonaMatchScore(
                mapGenre(row.genre),
                preferences,
                row.rating,
                persona,
                [row.title, row.description, row.subgenre, ...tags].join(' '),
              )
            : (matchScores[persona] ?? 50);
        })()
      : undefined,
  };
}

export function getCatalog(
  db: DatabaseSync,
  options: {
    limit?: number;
    offset?: number;
    query?: string;
    genre?: string;
    persona?: string;
  } = {},
): Experience[] {
  const limit = Math.min(10_000, Math.max(1, options.limit ?? 200));
  const offset = Math.max(0, options.offset ?? 0);
  const conditions = ["source_status = 'valid'"];
  const parameters: (string | number)[] = [];

  if (options.query) {
    conditions.push("(title LIKE ? ESCAPE '\\' OR creator LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
    const query = `%${options.query.replace(/[\\%_]/g, '\\$&')}%`;

    parameters.push(query, query, query);
  }

  const queryOrder = options.query
    ? `CASE
         WHEN lower(title) = lower(?) THEN 0
         WHEN lower(title) LIKE lower(?) ESCAPE '\\' THEN 1
         WHEN lower(creator) = lower(?) THEN 2
         WHEN lower(creator) LIKE lower(?) ESCAPE '\\' THEN 3
         WHEN lower(title) LIKE lower(?) ESCAPE '\\' THEN 4
         ELSE 5
       END,`
    : '';
  const queryOrderParameters = options.query
    ? [
        options.query,
        `${options.query.replace(/[\\%_]/g, '\\$&')}%`,
        options.query,
        `${options.query.replace(/[\\%_]/g, '\\$&')}%`,
        `%${options.query.replace(/[\\%_]/g, '\\$&')}%`,
      ]
    : [];
  const freshnessReferenceAt = db
    .prepare('SELECT MAX(source_date_fetched) AS reference_at FROM games WHERE source_date_fetched IS NOT NULL')
    .get() as { reference_at: string | null };
  const rows = db
    .prepare(
      `SELECT * FROM games
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${queryOrder} active_players DESC, universe_id
       LIMIT 10000`,
    )
    .all(...parameters, ...queryOrderParameters) as unknown as GameRow[];
  const experiences = rows
    .map((row) => toExperience(row, options.persona, freshnessReferenceAt.reference_at ?? undefined))
    .filter((experience) => !options.genre || options.genre === 'All' || experience.genre === options.genre);

  return experiences.slice(offset, offset + limit);
}

export function getCatalogCount(
  db: DatabaseSync,
  options: { query?: string; genre?: string } = {},
): number {
  const conditions = ["source_status = 'valid'"];
  const parameters: string[] = [];

  if (options.query) {
    conditions.push("(title LIKE ? ESCAPE '\\' OR creator LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
    const query = `%${options.query.replace(/[\\%_]/g, '\\$&')}%`;

    parameters.push(query, query, query);
  }

  const rows = db
    .prepare(`SELECT genre FROM games WHERE ${conditions.join(' AND ')}`)
    .all(...parameters) as Array<{ genre: string }>;

  if (!options.genre || options.genre === 'All') return rows.length;

  return rows.reduce((count, row) => count + (mapGenre(row.genre) === options.genre ? 1 : 0), 0);
}

export function getExperience(db: DatabaseSync, universeId: string): Experience | undefined {
  const row = db
    .prepare("SELECT * FROM games WHERE universe_id = ? AND source_status = 'valid'")
    .get(universeId) as GameRow | undefined;

  const freshnessReferenceAt = db
    .prepare('SELECT MAX(source_date_fetched) AS reference_at FROM games WHERE source_date_fetched IS NOT NULL')
    .get() as { reference_at: string | null };

  return row ? toExperience(row, undefined, freshnessReferenceAt.reference_at ?? undefined) : undefined;
}
