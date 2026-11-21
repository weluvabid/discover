/* @vitest-environment node */
import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../db/database';
import { getCatalog, getGenreCounts } from './catalog';

describe('catalog search ordering and genre counts', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = openDatabase(':memory:');
    const insert = db.prepare(`
      INSERT INTO games (
        universe_id, place_id, title, description, creator, genre, subgenre, tags_json,
        roblox_url, created_at, source_updated_at, active_players, rating, review_count,
        average_playtime_minutes, weekly_change, d1_retention, d7_retention, d30_retention,
        repeat_play_rate, average_session_minutes, synthetic_seed, match_scores_json,
        source_status, first_seen_at, updated_local_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid', ?, ?)
    `);

    const records = [
      ['101', '201', 'Blox Fruits', 'Pirate adventure', 'Gamer Robot', 'Action RPG', 'RPG', '2024-01-01', '2024-02-01', 1000, 92, 500],
      ['102', '202', 'Blox Fruits Arena', 'Competitive battles', 'Arena Studio', 'Action RPG', 'Fighting', '2024-03-01', '2024-04-01', 5000, 88, 900],
      ['103', '203', 'Blox Fruits Tycoon', 'Build a fruit empire', 'Tycoon Studio', 'Simulation', 'Sandbox', '2024-05-01', '2024-06-01', 300, 99, 1200],
    ] as const;

    for (const [id, place, title, description, creator, genre, subgenre, created, updated, players, rating, reviews] of records) {
      insert.run(
        id, place, title, description, creator, genre, subgenre, JSON.stringify([genre]),
        `https://www.roblox.com/games/${place}`, `${created}T00:00:00.000Z`, `${updated}T00:00:00.000Z`,
        players, rating, reviews, 30, 0, 0.4, 0.2, 0.1, 0.3, 20, 1, '{}',
        '2024-06-01T00:00:00.000Z', '2024-06-01T00:00:00.000Z',
      );
    }
  });

  afterEach(() => db.close());

  it('keeps relevance matching first and supports explicit metric sorting', () => {
    expect(getCatalog(db, { query: 'Blox Fruits' }).map((item) => item.id)).toEqual(['101', '102', '103']);
    expect(getCatalog(db, { query: 'Blox Fruits', sort: 'players' }).map((item) => item.id)).toEqual(['102', '101', '103']);
    expect(getCatalog(db, { query: 'Blox Fruits', sort: 'rating' }).map((item) => item.id)).toEqual(['103', '101', '102']);
    expect(getCatalog(db, { query: 'Blox Fruits', sort: 'reviews' }).map((item) => item.id)).toEqual(['103', '102', '101']);
    expect(getCatalog(db, { query: 'Blox Fruits', sort: 'launched' }).map((item) => item.id)).toEqual(['103', '102', '101']);
    expect(getCatalog(db, { query: 'Blox Fruits', sort: 'updated' }).map((item) => item.id)).toEqual(['103', '102', '101']);
  });

  it('counts distinct eligible experiences using the catalog genre mapping', () => {
    expect(getGenreCounts(db)).toEqual({
      All: 3,
      'Action RPG': 2,
      Exploration: 0,
      'Co-op': 0,
      Racing: 0,
      Horror: 0,
      Simulation: 1,
      Puzzle: 0,
    });
  });
});
