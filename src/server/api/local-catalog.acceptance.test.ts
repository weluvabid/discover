/* @vitest-environment node */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DISCOVERY_POLICY, getEligibility } from '@/features/discovery/engine/ranking';
import type { Experience } from '@/types/experience';
import { handleApiRequest } from './app';
import { seedPersonas } from '../ingestion/synthetic';
import { getCatalog } from '../ranking/catalog';

const databasePath = resolve(
  process.env.DATABASE_PATH ?? resolve(process.cwd(), 'data/roblox-games.db'),
);

if (!existsSync(databasePath)) {
  throw new Error(
    `Local catalog database not found at ${databasePath}. Run pnpm db:ingest first or set DATABASE_PATH.`,
  );
}

let db: DatabaseSync;

beforeAll(() => {
  db = new DatabaseSync(databasePath, { readOnly: true, enableForeignKeyConstraints: true });
});

afterAll(() => db.close());

describe('Local catalog acceptance (read-only)', () => {
  it('passes SQLite integrity and foreign-key checks', () => {
    const integrity = db.prepare('PRAGMA integrity_check').all() as Array<{
      integrity_check: string;
    }>;
    const foreignKeys = db.prepare('PRAGMA foreign_key_check').all();

    expect(integrity).toEqual([{ integrity_check: 'ok' }]);
    expect(foreignKeys).toEqual([]);
  });

  it('contains the synchronized Catalog v1 dataset', () => {
    const games = db.prepare('SELECT COUNT(*) AS count FROM games').get() as { count: number };
    const snapshots = db.prepare('SELECT COUNT(*) AS count FROM game_metric_snapshots').get() as {
      count: number;
    };
    const personas = db.prepare('SELECT COUNT(*) AS count FROM synthetic_personas').get() as {
      count: number;
    };

    expect(Number(games.count)).toBe(1307);
    expect(Number(snapshots.count)).toBe(11962);
    expect(Number(personas.count)).toBe(12);
  });

  it('has unique universe IDs and no invalid source status values', () => {
    const result = db
      .prepare(
        `SELECT COUNT(*) AS total, COUNT(DISTINCT universe_id) AS unique_ids,
        SUM(CASE WHEN source_status NOT IN ('pending','valid','unavailable','invalid') THEN 1 ELSE 0 END) AS bad_status
        FROM games`,
      )
      .get() as { total: number; unique_ids: number; bad_status: number };

    expect(Number(result.total)).toBe(Number(result.unique_ids));
    expect(Number(result.bad_status)).toBe(0);
  });

  it('has valid core metadata and bounded synthetic metrics', () => {
    const result = db
      .prepare(
        `SELECT
        SUM(CASE WHEN title IS NULL OR trim(title) = '' THEN 1 ELSE 0 END) AS missing_title,
        SUM(CASE WHEN roblox_url NOT LIKE 'https://www.roblox.com/games/%' THEN 1 ELSE 0 END) AS bad_url,
        SUM(CASE WHEN active_players < 0 OR rating < 0 OR rating > 100 OR review_count < 0 THEN 1 ELSE 0 END) AS bad_core_metrics,
        SUM(CASE WHEN d1_retention NOT BETWEEN 0 AND 1 OR d7_retention NOT BETWEEN 0 AND d1_retention OR d30_retention NOT BETWEEN 0 AND d7_retention OR repeat_play_rate NOT BETWEEN 0 AND 1 THEN 1 ELSE 0 END) AS bad_rates,
        SUM(CASE WHEN average_playtime_minutes < 0 OR average_session_minutes < 0 THEN 1 ELSE 0 END) AS bad_durations,
        SUM(CASE WHEN json_valid(tags_json) = 0 OR json_valid(match_scores_json) = 0 OR json_type(match_scores_json) != 'object' THEN 1 ELSE 0 END) AS bad_json
        FROM games`,
      )
      .get() as Record<string, number>;

    for (const value of Object.values(result)) expect(Number(value)).toBe(0);
  });

  it('has no duplicate historical observations and every snapshot references a game', () => {
    const duplicates = db
      .prepare(
        `SELECT COUNT(*) AS count FROM (
        SELECT universe_id, observed_at, source FROM game_metric_snapshots
        GROUP BY universe_id, observed_at, source HAVING COUNT(*) > 1
      )`,
      )
      .get() as { count: number };
    const orphaned = db
      .prepare(
        `SELECT COUNT(*) AS count FROM game_metric_snapshots s
        LEFT JOIN games g ON g.universe_id = s.universe_id WHERE g.universe_id IS NULL`,
      )
      .get() as { count: number };

    expect(Number(duplicates.count)).toBe(0);
    expect(Number(orphaned.count)).toBe(0);
  });

  it('serves all five discovery contexts with eligible, ordered and explainable results', async () => {
    const contexts = [
      'featured',
      'trending',
      'recommended',
      'hidden-gems',
      'recently-launched',
    ] as const;
    const catalog = getCatalog(db, { limit: 10_000 });
    const freshnessReference = catalog
      .map((experience) => Date.parse(experience.freshnessReferenceAt ?? ''))
      .filter(Number.isFinite)
      .reduce((latest, timestamp) => Math.max(latest, timestamp), Number.NEGATIVE_INFINITY);
    const now = Number.isFinite(freshnessReference) ? new Date(freshnessReference) : new Date();

    for (const context of contexts) {
      const response = await handleApiRequest(
        db,
        'POST',
        new URL(`http://localhost/api/discover/${context}`),
        { limit: 100, persona: 'builder' },
      );

      expect(response.status, context).toBe(200);
      const body = response.body as {
        context: string;
        totalCandidates: number;
        results: Array<{
          experience: Experience;
          score: number;
          position: number;
          explanation: { context: string; eligibilityReasons: string[] };
        }>;
      };

      expect(body.context).toBe(context);
      expect(body.totalCandidates).toBeGreaterThan(0);
      const eligibleCount = catalog.filter(
        (experience) => getEligibility(context, experience, now).eligible,
      ).length;

      expect(body.results.length).toBe(Math.min(100, eligibleCount));
      body.results.forEach((item, index) => {
        expect(item.position).toBe(index + 1);
        expect(Number.isFinite(item.score)).toBe(true);
        expect(item.explanation.context).toBe(context);
        expect(item.explanation.eligibilityReasons.length).toBeGreaterThan(0);
        expect(getEligibility(context, item.experience, now).eligible).toBe(true);
      });
      expect(
        body.results.every((item, index, rows) => {
          const previous = rows[index - 1];
          return index === 0 || (previous !== undefined && previous.score >= item.score);
        }),
      ).toBe(true);
    }

    expect(DISCOVERY_POLICY.featured.minimumRating).toBe(85);
  });

  it('uses all twelve deterministic persona definitions and returns persona-specific scores', async () => {
    const personas = seedPersonas();

    expect(personas).toHaveLength(12);

    for (const persona of personas) {
      const response = await handleApiRequest(
        db,
        'POST',
        new URL('http://localhost/api/discover/recommended'),
        { persona: persona.id, limit: 5 },
      );

      expect(response.status).toBe(200);
      expect((response.body as { persona: string | null }).persona).toBe(persona.id);
      const results = (response.body as { results: Array<{ experience: Experience }> }).results;

      for (const result of results) {
        expect(result.experience.matchScore).toEqual(expect.any(Number));
        expect(result.experience.matchScore).toBeGreaterThanOrEqual(20);
        expect(result.experience.matchScore).toBeLessThanOrEqual(99);
      }
    }

    const listed = await handleApiRequest(db, 'GET', new URL('http://localhost/api/personas'));

    expect((listed.body as { data: unknown[] }).data).toHaveLength(12);
  });

  it('supports catalog pagination without gaps or duplicate IDs', async () => {
    const first = await handleApiRequest(
      db,
      'GET',
      new URL('http://localhost/api/experiences?limit=500&offset=0'),
    );
    const second = await handleApiRequest(
      db,
      'GET',
      new URL('http://localhost/api/experiences?limit=500&offset=500'),
    );
    const third = await handleApiRequest(
      db,
      'GET',
      new URL('http://localhost/api/experiences?limit=500&offset=1000'),
    );
    const pages = [first, second, third].map((response) => {
      expect(response.status).toBe(200);

      return (response.body as { data: Experience[]; total: number }).data;
    });
    const ids = pages.flat().map((experience) => experience.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
    expect((first.body as { total: number }).total).toBeGreaterThanOrEqual(ids.length);
  });

  it('searches real catalog titles and resolves real experience details', async () => {
    const sample = db
      .prepare(
        "SELECT universe_id, title FROM games WHERE source_status = 'valid' ORDER BY universe_id LIMIT 1",
      )
      .get() as { universe_id: string; title: string } | undefined;

    if (!sample) {
      throw new Error('The local catalog must contain at least one valid experience.');
    }

    const query = sample.title.slice(0, Math.min(12, sample.title.length));
    const search = await handleApiRequest(
      db,
      'GET',
      new URL(`http://localhost/api/search?q=${encodeURIComponent(query)}`),
    );
    const detail = await handleApiRequest(
      db,
      'GET',
      new URL(`http://localhost/api/experiences/${sample.universe_id}`),
    );

    expect(search.status).toBe(200);
    expect(
      (search.body as { data: Experience[] }).data.some((item) => item.id === sample.universe_id),
    ).toBe(true);
    expect(detail).toMatchObject({
      status: 200,
      body: { id: sample.universe_id, title: sample.title },
    });
  });

  it('reports health consistently with the eligible local catalog', async () => {
    const response = await handleApiRequest(db, 'GET', new URL('http://localhost/api/health'));
    const count = db
      .prepare("SELECT COUNT(*) AS count FROM games WHERE source_status = 'valid'")
      .get() as { count: number };

    expect(response).toMatchObject({
      status: 200,
      body: { status: 'ok', catalogCount: Number(count.count) },
    });
  });
});
