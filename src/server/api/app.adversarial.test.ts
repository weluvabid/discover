/* @vitest-environment node */
import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleApiRequest } from './app';
import { openDatabase } from '../db/database';
import { getCatalog } from '../ranking/catalog';

function insertGame(
  db: DatabaseSync,
  input: { universeId: string; title: string; description?: string; status?: string },
) {
  db.prepare(
    `INSERT INTO games (
      universe_id, place_id, title, description, creator, genre, subgenre, tags_json,
      roblox_url, created_at, active_players, rating, review_count,
      average_playtime_minutes, weekly_change, d1_retention, d7_retention,
      d30_retention, repeat_play_rate, average_session_minutes, synthetic_seed,
      match_scores_json, source_status, first_seen_at, updated_local_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.universeId,
    `place-${input.universeId}`,
    input.title,
    input.description ?? '',
    'Adversarial Test Creator',
    'Simulation',
    'Sandbox',
    '[]',
    `https://www.roblox.com/games/${input.universeId}`,
    '2026-11-01T00:00:00.000Z',
    10,
    90,
    100,
    20,
    1,
    0.3,
    0.2,
    0.1,
    0.4,
    20,
    1,
    '{}',
    input.status ?? 'valid',
    '2026-11-01T00:00:00.000Z',
    '2026-11-01T00:00:00.000Z',
  );
}

describe('Discover API adversarial inputs', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = openDatabase(':memory:');
    insertGame(db, {
      universeId: '1001',
      title: '100% Fun_Quest',
      description: "Builder's sandbox; %_ wildcard bait",
    });
    insertGame(db, { universeId: '1002', title: 'Ordinary Adventure' });
    insertGame(db, { universeId: '1003', title: 'Unavailable Game', status: 'unavailable' });
  });

  afterEach(() => db.close());

  it('treats SQL metacharacters as literal search text', () => {
    expect(getCatalog(db, { query: '%' }).map((item) => item.id)).toEqual(['1001']);
    expect(getCatalog(db, { query: '_' }).map((item) => item.id)).toEqual(['1001']);
    expect(getCatalog(db, { query: "' OR 1=1 --" })).toEqual([]);
  });

  it('orders search matches by title relevance before player popularity', () => {
    insertGame(db, { universeId: '1004', title: 'Adventure Quest' });
    insertGame(db, { universeId: '1005', title: 'Ordinary Adventure', description: 'Adventure game' });

    const results = getCatalog(db, { query: 'Adventure' });

    expect(results.map((item) => item.id)).toEqual(['1004', '1002', '1005']);
  });

  it('does not expose unavailable records through catalog, search or detail routes', async () => {
    const catalog = await handleApiRequest(db, 'GET', new URL('http://localhost/api/experiences'));
    const search = await handleApiRequest(
      db,
      'GET',
      new URL('http://localhost/api/search?q=Unavailable'),
    );
    const detail = await handleApiRequest(
      db,
      'GET',
      new URL('http://localhost/api/experiences/1003'),
    );

    expect(catalog.status).toBe(200);
    expect((catalog.body as { data: Array<{ id: string }> }).data.map((item) => item.id)).toEqual([
      '1001',
      '1002',
    ]);
    expect((search.body as { data: unknown[] }).data).toHaveLength(0);
    expect(detail.status).toBe(404);
  });

  it.each(['0', '-1', '1.5', '501', 'NaN', 'Infinity'])('rejects hostile pagination limit %s', async (limit) => {
    const result = await handleApiRequest(
      db,
      'GET',
      new URL(`http://localhost/api/experiences?limit=${encodeURIComponent(limit)}`),
    );

    expect(result.status).toBe(400);
  });

  it('rejects oversized search strings before querying SQLite', async () => {
    const result = await handleApiRequest(
      db,
      'GET',
      new URL(`http://localhost/api/search?q=${'x'.repeat(201)}`),
    );

    expect(result.status).toBe(400);
  });

  it('rejects invalid discovery limits and unknown contexts', async () => {
    const invalidLimit = await handleApiRequest(
      db,
      'POST',
      new URL('http://localhost/api/discover/recommended'),
      { limit: Number.POSITIVE_INFINITY },
    );
    const unknownContext = await handleApiRequest(
      db,
      'POST',
      new URL('http://localhost/api/discover/../../admin'),
      {},
    );

    expect(invalidLimit.status).toBe(400);
    expect(unknownContext.status).toBe(404);
  });

  it('falls back to the default ranking configuration for malformed signal payloads', async () => {
    const result = await handleApiRequest(
      db,
      'POST',
      new URL('http://localhost/api/discover/recommended'),
      { signals: [{ id: '__proto__', weight: Number.NaN }], limit: 5 },
    );

    expect(result.status).toBe(200);
    expect((result.body as { results: unknown[] }).results).toHaveLength(2);
  });

  it('keeps pagination stable and reports filtered totals', async () => {
    const first = await handleApiRequest(
      db,
      'GET',
      new URL('http://localhost/api/experiences?limit=1&offset=0&q=Adventure'),
    );
    const second = await handleApiRequest(
      db,
      'GET',
      new URL('http://localhost/api/experiences?limit=1&offset=1&q=Adventure'),
    );

    expect(first).toMatchObject({ status: 200, body: { total: 1, offset: 0 } });
    expect(second).toMatchObject({ status: 200, body: { total: 1, offset: 1, data: [] } });
  });
});
