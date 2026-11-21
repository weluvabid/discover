import type { DatabaseSync } from 'node:sqlite';
import type { Experience, ExperienceGenre } from '@/types/experience';

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

function toExperience(row: GameRow, persona?: string): Experience {
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
    tags: tags.length > 0 ? tags : [row.genre],
    matchScore: persona ? (matchScores[persona] ?? 50) : undefined,
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
    conditions.push('(title LIKE ? OR creator LIKE ? OR description LIKE ?)');
    const query = `%${options.query.replace(/[\\%_]/g, '\\$&')}%`;

    parameters.push(query, query, query);
  }

  if (options.genre && options.genre !== 'All') {
    conditions.push('genre = ?');
    parameters.push(options.genre);
  }

  const rows = db
    .prepare(
      `SELECT * FROM games
       WHERE ${conditions.join(' AND ')}
       ORDER BY active_players DESC, universe_id
       LIMIT ? OFFSET ?`,
    )
    .all(...parameters, limit, offset) as unknown as GameRow[];

  return rows.map((row) => toExperience(row, options.persona));
}

export function getCatalogCount(db: DatabaseSync): number {
  const result = db
    .prepare("SELECT COUNT(*) AS count FROM games WHERE source_status = 'valid'")
    .get() as { count: number };

  return Number(result.count);
}

export function getExperience(db: DatabaseSync, universeId: string): Experience | undefined {
  const row = db
    .prepare("SELECT * FROM games WHERE universe_id = ? AND source_status = 'valid'")
    .get(universeId) as GameRow | undefined;

  return row ? toExperience(row) : undefined;
}
