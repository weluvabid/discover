import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleApiRequest } from './app';
import { openDatabase } from '../db/database';

describe('Discover API handler', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = openDatabase(':memory:');
    db.prepare(
      `INSERT INTO games (
      universe_id, place_id, title, description, creator, genre, subgenre, tags_json,
      roblox_url, created_at, active_players, rating, review_count,
      average_playtime_minutes, weekly_change, d1_retention, d7_retention,
      d30_retention, repeat_play_rate, average_session_minutes, synthetic_seed,
      match_scores_json, source_status, first_seen_at, updated_local_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid', ?, ?)`,
    ).run(
      '123456',
      '654321',
      'Sample Experience',
      'A sample Roblox experience for API tests.',
      'Sample Creator',
      'Simulation',
      'Sandbox',
      '["Simulation","Sandbox"]',
      'https://www.roblox.com/games/654321',
      '2026-11-01T00:00:00.000Z',
      1200,
      92,
      500,
      35,
      12,
      0.42,
      0.28,
      0.16,
      0.54,
      28,
      20261121,
      '{"builder":94}',
      '2026-11-21T00:00:00.000Z',
      '2026-11-21T00:00:00.000Z',
    );
  });

  afterEach(() => db.close());

  it('serves catalog health and universe-ID lookups', async () => {
    const health = await handleApiRequest(db, 'GET', new URL('http://localhost/api/health'));
    const detail = await handleApiRequest(
      db,
      'GET',
      new URL('http://localhost/api/experiences/123456'),
    );

    expect(health).toMatchObject({ status: 200, body: { status: 'ok', catalogCount: 1 } });
    expect(detail).toMatchObject({
      status: 200,
      body: { id: '123456', title: 'Sample Experience' },
    });
  });

  it('runs the existing ranking engine against the persisted catalog', async () => {
    const result = await handleApiRequest(
      db,
      'POST',
      new URL('http://localhost/api/discover/recommended'),
      { persona: 'builder', limit: 10 },
    );

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ context: 'recommended', persona: 'builder' });
    expect((result.body as { results: unknown[] }).results).toHaveLength(1);
  });

  it('rejects unknown discovery contexts and invalid result limits', async () => {
    const context = await handleApiRequest(
      db,
      'POST',
      new URL('http://localhost/api/discover/unknown'),
      {},
    );
    const limit = await handleApiRequest(
      db,
      'POST',
      new URL('http://localhost/api/discover/recommended'),
      { limit: 1000 },
    );

    expect(context.status).toBe(404);
    expect(limit.status).toBe(400);
  });
});
