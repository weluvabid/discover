import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { extractRobloxIds, parseCompactCount, parseCsv, parseSourceDate } from './csv';
import { fetchGameDetails, fetchGameIcons } from './roblox';
import type { RobloxGame } from './roblox';
import { generateSyntheticMetrics, seedPersonas } from './synthetic';

export const DEFAULT_CSV_URL =
  'https://raw.githubusercontent.com/jansencruz23/roblox-webscraper-csharp/fde27463363626e863e4b501c20ed0072f60e43e/RobloxWebScraper/data/roblox_games_data.csv';

const SEED = Number(process.env.SYNTHETIC_SEED ?? 20261121);

if (!Number.isSafeInteger(SEED)) {
  throw new Error('SYNTHETIC_SEED must be a safe integer.');
}

const now = () => new Date().toISOString();

function genreFor(value: string): string {
  const normalized = String(value ?? '').trim();

  return !normalized || normalized.toLowerCase() === 'n/a' ? 'Other' : normalized;
}

function mapGenre(value: string): string {
  const genre = genreFor(value);

  if (/horror|survival/i.test(genre)) return 'Horror';

  if (/race|sports/i.test(genre)) return 'Racing';

  if (/roleplay|co-op|coop|party/i.test(genre)) return 'Co-op';

  if (/simulation|shopping|avatar/i.test(genre)) return 'Simulation';

  if (/obby|platform|puzzle|casual/i.test(genre)) return 'Puzzle';

  if (/adventure|explor/i.test(genre)) return 'Exploration';

  if (/action|rpg|shooter|fight/i.test(genre)) return 'Action RPG';

  return 'Simulation';
}

function ratingFromCounts(
  likes: number | null,
  dislikes: number | null,
): { rating: number; count: number } {
  const positive = likes ?? 0;
  const negative = dislikes ?? 0;
  const total = positive + negative;

  if (total === 0) return { rating: 75, count: 0 };

  // The CSV only exposes abbreviated like/dislike totals. Smooth the ratio toward a neutral prior.
  const rating = ((positive + negative * 0.5 + 500 * 0.75) / (total + 500)) * 100;

  return { rating: Math.round(rating * 10) / 10, count: total };
}

interface RawRow {
  rowNumber: number;
  placeId: string;
  universeId: string;
  title: string;
  creator: string;
  genre: string;
  age: string;
  active: number;
  favorites: number | null;
  visits: string;
  likes: number | null;
  dislikes: number | null;
  created: string | null;
  updated: string | null;
  dateFetched: string | null;
  voice: string;
  camera: string;
  serverSize: number | null;
  robloxUrl: string;
}

function normalizeRow(record: {
  rowNumber: number;
  values: Record<string, string>;
}): RawRow | null {
  const values = record.values;
  const ids = extractRobloxIds(values.GameLink ?? '');

  if (!ids) return null;

  const active = parseCompactCount(values.Active ?? '');

  if (active === null || active < 0) return null;

  return {
    rowNumber: record.rowNumber,
    ...ids,
    title: (values.Title ?? '').trim(),
    creator: (values.Creator ?? '').trim() || 'Unknown creator',
    genre: genreFor(values.Genre ?? ''),
    age: (values.AgeRecommendation ?? '').trim(),
    active,
    favorites: parseCompactCount(values.Favorites ?? ''),
    visits: (values.Visits ?? '').trim(),
    likes: parseCompactCount(values.Likes ?? ''),
    dislikes: parseCompactCount(values.Dislikes ?? ''),
    created: parseSourceDate(values.Created ?? ''),
    updated: parseSourceDate(values.Updated ?? ''),
    dateFetched: parseSourceDate(values.DateFetched ?? ''),
    voice: (values.VoiceChat ?? '').trim(),
    camera: (values.Camera ?? '').trim(),
    serverSize: parseCompactCount(values.ServerSize ?? ''),
    robloxUrl: `https://www.roblox.com/games/${ids.placeId}`,
  };
}

function recordError(
  db: DatabaseSync,
  runId: string,
  rowNumber: number | null,
  universeId: string | null,
  reason: string,
): void {
  db.prepare(
    'INSERT INTO ingestion_errors(run_id,row_number,universe_id,reason,created_at) VALUES(?,?,?,?,?)',
  ).run(runId, rowNumber, universeId, reason, now());
}

function insertRaw(db: DatabaseSync, row: RawRow): 'inserted' | 'updated' {
  const previous = db
    .prepare('SELECT universe_id FROM games WHERE universe_id = ?')
    .get(row.universeId);
  const rating = ratingFromCounts(row.likes, row.dislikes);
  const timestamp = now();
  const tags = [...new Set([mapGenre(row.genre), row.genre].filter(Boolean))];

  db.prepare(
    `
    INSERT INTO games (
      universe_id, place_id, title, creator, genre, subgenre, age_recommendation,
      max_players, voice_chat, camera, roblox_url, created_at, updated_at,
      source_created_at, source_updated_at, source_active_players, source_favorites,
      source_visits, source_likes, source_dislikes, source_date_fetched, source_rating,
      source_review_count, active_players, rating, review_count, synthetic_seed,
      source_status, first_seen_at, updated_local_at, tags_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(universe_id) DO UPDATE SET
      place_id = excluded.place_id,
      title = excluded.title,
      creator = excluded.creator,
      genre = excluded.genre,
      subgenre = excluded.subgenre,
      tags_json = excluded.tags_json,
      age_recommendation = excluded.age_recommendation,
      max_players = excluded.max_players,
      voice_chat = excluded.voice_chat,
      camera = excluded.camera,
      roblox_url = excluded.roblox_url,
      source_created_at = excluded.source_created_at,
      source_updated_at = excluded.source_updated_at,
      source_active_players = excluded.source_active_players,
      source_favorites = excluded.source_favorites,
      source_visits = excluded.source_visits,
      source_likes = excluded.source_likes,
      source_dislikes = excluded.source_dislikes,
      source_date_fetched = excluded.source_date_fetched,
      source_rating = excluded.source_rating,
      source_review_count = excluded.source_review_count,
      updated_local_at = excluded.updated_local_at
  `,
  ).run(
    row.universeId,
    row.placeId,
    row.title,
    row.creator,
    mapGenre(row.genre),
    row.genre,
    row.age || null,
    row.serverSize,
    row.voice || null,
    row.camera || null,
    row.robloxUrl,
    row.created,
    row.updated,
    row.created,
    row.updated,
    row.active,
    row.favorites,
    row.visits,
    row.likes,
    row.dislikes,
    row.dateFetched,
    rating.rating,
    rating.count,
    row.active,
    rating.rating,
    rating.count,
    SEED,
    'pending',
    timestamp,
    timestamp,
    JSON.stringify(tags),
  );

  db.prepare(
    `
    INSERT OR IGNORE INTO game_metric_snapshots (
      universe_id, observed_at, active_players, visits, favorites, rating, review_count, source
    ) VALUES (?,?,?,?,?,?,?,'csv-2024')
  `,
  ).run(
    row.universeId,
    row.dateFetched ?? '2024-11-05T00:00:00.000Z',
    row.active,
    row.visits,
    row.favorites,
    rating.rating,
    rating.count,
  );

  return previous ? 'updated' : 'inserted';
}

function enrichOne(
  db: DatabaseSync,
  row: RawRow,
  game: RobloxGame | undefined,
  icon: string | undefined,
): 'valid' | 'unavailable' {
  if (!game) {
    db.prepare(
      "UPDATE games SET source_status = 'unavailable', updated_local_at = ? WHERE universe_id = ?",
    ).run(now(), row.universeId);

    return 'unavailable';
  }

  const existing = db
    .prepare(
      'SELECT source_active_players, source_rating, source_review_count FROM games WHERE universe_id = ?',
    )
    .get(row.universeId) as
    | { source_active_players: number; source_rating: number; source_review_count: number }
    | undefined;
  const sourceActivePlayers = existing?.source_active_players ?? 0;
  const sourceRating = existing?.source_rating ?? 75;
  const activePlayers = Math.max(
    0,
    Number.isFinite(game.playing) ? game.playing : sourceActivePlayers,
  );
  const genre = mapGenre(game.genre || row.genre);
  const synthetic = generateSyntheticMetrics({
    universeId: row.universeId,
    genre,
    sourceActivePlayers: activePlayers,
    rating: sourceRating,
    seed: SEED,
  });
  const publishedAt = game.created || row.created;
  const updatedAt = game.updated || row.updated;
  const reviewCount = existing?.source_review_count ?? 0;
  const tags = [...new Set([genre, game.genre || row.genre, row.genre].filter(Boolean))];
  const enrichedAt = now();

  db.prepare(
    `
    UPDATE games SET
      title = ?, description = ?, creator = ?, creator_id = ?, creator_type = ?,
      creator_verified = ?, genre = ?, subgenre = ?, max_players = ?, artwork_url = ?,
      roblox_url = ?, created_at = ?, updated_at = ?, active_players = ?, rating = ?,
      review_count = ?, average_playtime_minutes = ?, weekly_change = ?, d1_retention = ?,
      d7_retention = ?, d30_retention = ?, repeat_play_rate = ?, average_session_minutes = ?,
      match_scores_json = ?, source_status = 'valid', last_enriched_at = ?,
      updated_local_at = ?, tags_json = ?
    WHERE universe_id = ?
  `,
  ).run(
    game.name || row.title,
    game.description ?? '',
    game.creator?.name || row.creator,
    String(game.creator?.id ?? ''),
    game.creator?.type ?? null,
    game.creator?.hasVerifiedBadge ? 1 : 0,
    genre,
    game.genre || row.genre,
    game.maxPlayers ?? row.serverSize,
    icon ?? '',
    `https://www.roblox.com/games/${game.rootPlaceId || row.placeId}`,
    publishedAt,
    updatedAt,
    activePlayers,
    sourceRating,
    reviewCount,
    synthetic.averagePlaytimeMinutes,
    synthetic.weeklyChange,
    synthetic.d1Retention,
    synthetic.d7Retention,
    synthetic.d30Retention,
    synthetic.repeatPlayRate,
    synthetic.averageSessionMinutes,
    JSON.stringify(synthetic.matchScores),
    enrichedAt,
    enrichedAt,
    JSON.stringify(tags),
    row.universeId,
  );

  db.prepare(
    `
    INSERT OR IGNORE INTO game_metric_snapshots (
      universe_id, observed_at, active_players, visits, favorites, rating, review_count,
      weekly_change, source
    ) VALUES (?,?,?,?,?,?,?,0,'roblox-api')
  `,
  ).run(
    row.universeId,
    enrichedAt,
    activePlayers,
    String(game.visits ?? ''),
    game.favoritedCount,
    sourceRating,
    reviewCount,
  );
  db.prepare(
    `
    INSERT OR IGNORE INTO game_metric_snapshots (
      universe_id, observed_at, active_players, rating, review_count, weekly_change, source
    ) VALUES (?,?,?,?,?,?, 'synthetic')
  `,
  ).run(
    row.universeId,
    enrichedAt,
    activePlayers,
    sourceRating,
    reviewCount,
    synthetic.weeklyChange,
  );

  return 'valid';
}

function upsertPersonas(db: DatabaseSync): void {
  const statement = db.prepare(`
    INSERT INTO synthetic_personas(id, label, description, preferences_json)
    VALUES(?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      label = excluded.label,
      description = excluded.description,
      preferences_json = excluded.preferences_json
  `);

  for (const persona of seedPersonas()) {
    statement.run(
      persona.id,
      persona.label,
      persona.description,
      JSON.stringify(persona.preferences),
    );
  }
}

export interface ImportOptions {
  url?: string;
  limit?: number;
  enrich?: boolean;
  signal?: AbortSignal;
}

export async function importCatalog(db: DatabaseSync, options: ImportOptions = {}) {
  const url = options.url ?? DEFAULT_CSV_URL;
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const runId = randomUUID();
  const startedAt = now();

  if (!(limit === Number.POSITIVE_INFINITY || (Number.isSafeInteger(limit) && limit > 0))) {
    throw new Error('Import limit must be a positive integer.');
  }

  db.prepare(
    "INSERT INTO ingestion_runs(id, source, status, started_at) VALUES(?, ?, 'running', ?)",
  ).run(runId, url, startedAt);
  upsertPersonas(db);

  const stats = {
    runId,
    rowsSeen: 0,
    rowsValid: 0,
    rowsInvalid: 0,
    rowsUnavailable: 0,
    rowsInserted: 0,
    rowsUpdated: 0,
  };

  try {
    const response = await fetch(url, {
      signal: options.signal,
      headers: { 'User-Agent': 'RobloxDiscoverPortfolio/0.1' },
    });

    if (!response.ok || !response.body) {
      throw new Error(`CSV source returned HTTP ${response.status}.`);
    }

    const batch: RawRow[] = [];
    const enrichedUniverseIds = new Set<string>();

    const flush = async () => {
      if (batch.length === 0) return;

      db.exec('BEGIN IMMEDIATE');

      try {
        for (const row of batch) {
          const result = insertRaw(db, row);

          if (result === 'inserted') stats.rowsInserted += 1;
          else stats.rowsUpdated += 1;
        }

        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }

      const rows = batch.splice(0);
      const uniqueRows = rows.filter((row) => {
        if (enrichedUniverseIds.has(row.universeId)) return false;

        enrichedUniverseIds.add(row.universeId);

        return true;
      });

      if (options.enrich === false) return;

      for (let offset = 0; offset < uniqueRows.length; offset += 50) {
        const group = uniqueRows.slice(offset, offset + 50);
        const universeIds = group.map((row) => row.universeId);
        let games: Map<string, RobloxGame>;
        let icons: Map<string, string>;

        try {
          games = await fetchGameDetails(universeIds, options.signal);
        } catch (error) {
          for (const row of group) {
            stats.rowsUnavailable += 1;
            db.prepare(
              "UPDATE games SET source_status = 'unavailable', updated_local_at = ? WHERE universe_id = ?",
            ).run(now(), row.universeId);
            recordError(
              db,
              runId,
              row.rowNumber,
              row.universeId,
              error instanceof Error ? error.message : 'Roblox metadata request failed',
            );
          }

          continue;
        }

        try {
          icons = await fetchGameIcons(universeIds, options.signal);
        } catch (error) {
          icons = new Map();
          recordError(
            db,
            runId,
            null,
            null,
            error instanceof Error
              ? `Thumbnail enrichment unavailable: ${error.message}`
              : 'Thumbnail enrichment unavailable.',
          );
        }

        db.exec('BEGIN IMMEDIATE');

        try {
          for (const row of group) {
            const status = enrichOne(db, row, games.get(row.universeId), icons.get(row.universeId));

            if (status === 'valid') {
              stats.rowsValid += 1;
            } else {
              stats.rowsUnavailable += 1;
              recordError(
                db,
                runId,
                row.rowNumber,
                row.universeId,
                'Roblox returned no public game metadata for this universe ID.',
              );
            }
          }

          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      }
    };

    for await (const record of parseCsv(response.body)) {
      if (stats.rowsSeen >= limit) break;

      stats.rowsSeen += 1;

      const row = normalizeRow(record);

      if (!row) {
        stats.rowsInvalid += 1;
        recordError(
          db,
          runId,
          record.rowNumber,
          null,
          'Missing or invalid Roblox place/universe IDs or active-player count.',
        );
        continue;
      }

      if (!row.title) {
        stats.rowsInvalid += 1;
        recordError(db, runId, row.rowNumber, row.universeId, 'Missing experience title.');
        continue;
      }

      batch.push(row);

      if (batch.length >= 50) await flush();
    }

    await flush();

    db.prepare(
      `
      UPDATE ingestion_runs SET
        status = 'completed', finished_at = ?, rows_seen = ?, rows_valid = ?,
        rows_invalid = ?, rows_unavailable = ?, rows_inserted = ?, rows_updated = ?
      WHERE id = ?
    `,
    ).run(
      now(),
      stats.rowsSeen,
      stats.rowsValid,
      stats.rowsInvalid,
      stats.rowsUnavailable,
      stats.rowsInserted,
      stats.rowsUpdated,
      runId,
    );

    return stats;
  } catch (error) {
    db.prepare(
      `
      UPDATE ingestion_runs SET
        status = 'failed', finished_at = ?, rows_seen = ?, rows_valid = ?,
        rows_invalid = ?, rows_unavailable = ?, rows_inserted = ?, rows_updated = ?, error = ?
      WHERE id = ?
    `,
    ).run(
      now(),
      stats.rowsSeen,
      stats.rowsValid,
      stats.rowsInvalid,
      stats.rowsUnavailable,
      stats.rowsInserted,
      stats.rowsUpdated,
      error instanceof Error ? error.message : 'Unknown ingestion failure',
      runId,
    );

    throw error;
  }
}
