import type { DatabaseSync } from 'node:sqlite';

type HranaValue =
  | { type: 'null' }
  | { type: 'text'; value: string }
  | { type: 'integer'; value: string }
  | { type: 'float'; value: number }
  | { type: 'blob'; base64: string };

type HranaResult = {
  type: string;
  error?: { message?: string };
  response?: {
    result?: {
      rows?: Array<Array<{ value?: string }>>;
    };
  };
};

function hranaValue(value: unknown): HranaValue {
  if (value === null || value === undefined) return { type: 'null' };

  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { type: 'integer', value: String(value) }
      : { type: 'float', value };
  }

  if (typeof value === 'bigint') return { type: 'integer', value: value.toString() };

  if (typeof value === 'boolean') {
    return { type: 'integer', value: value ? '1' : '0' };
  }

  return { type: 'text', value: String(value) };
}

function execute(sql: string, args: unknown[] = []) {
  return {
    type: 'execute',
    stmt: {
      sql,
      ...(args.length > 0 ? { args: args.map(hranaValue) } : {}),
    },
  };
}

function endpointFor(databaseUrl: string): string {
  const host = databaseUrl
    .replace(/^libsql:\/\//, '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  if (!host || host.includes('/')) {
    throw new Error('TURSO_DATABASE_URL must be a libsql:// or HTTPS database URL.');
  }

  return `https://${host}/v2/pipeline`;
}

async function pipeline(
  endpoint: string,
  token: string,
  requests: Array<Record<string, unknown>>,
): Promise<HranaResult[]> {
  const finalRequests =
    requests.at(-1)?.type === 'close' ? requests : [...requests, { type: 'close' }];
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ baton: null, requests: finalRequests }),
  });

  if (!response.ok) {
    throw new Error(
      `Turso pipeline returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as { results?: HranaResult[] };
  const results = payload.results ?? [];

  for (const result of results) {
    if (result.type === 'error') {
      throw new Error(`Turso SQL error: ${result.error?.message ?? 'Unknown error'}`);
    }
  }

  return results;
}

export async function syncToTurso(
  db: DatabaseSync,
  options: { url?: string; authToken?: string; batchSize?: number } = {},
) {
  const databaseUrl = options.url ?? process.env.TURSO_DATABASE_URL;
  const token = options.authToken ?? process.env.TURSO_AUTH_TOKEN;

  if (!databaseUrl) throw new Error('TURSO_DATABASE_URL is required.');

  if (!token) throw new Error('TURSO_AUTH_TOKEN is required.');

  const batchSize = options.batchSize ?? 50;

  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error('Turso batch size must be an integer from 1 to 500.');
  }

  const endpoint = endpointFor(databaseUrl);

  await pipeline(endpoint, token, [
    execute(
      'CREATE TABLE IF NOT EXISTS discover_personas (id TEXT PRIMARY KEY NOT NULL,label TEXT NOT NULL,description TEXT NOT NULL,preferences_json TEXT NOT NULL)',
    ),
    execute(
      'CREATE TABLE IF NOT EXISTS discover_games (universe_id TEXT PRIMARY KEY NOT NULL,payload_json TEXT NOT NULL,updated_local_at TEXT NOT NULL)',
    ),
    execute(
      'CREATE TABLE IF NOT EXISTS discover_metric_snapshots (universe_id TEXT NOT NULL,observed_at TEXT NOT NULL,source TEXT NOT NULL,payload_json TEXT NOT NULL,PRIMARY KEY(universe_id,observed_at,source))',
    ),
    execute(
      'CREATE INDEX IF NOT EXISTS idx_discover_games_updated ON discover_games(updated_local_at)',
    ),
    execute(
      'CREATE TABLE IF NOT EXISTS discover_sync_state (key TEXT PRIMARY KEY,value TEXT NOT NULL)',
    ),
  ]);

  const cursorResults = await pipeline(endpoint, token, [
    {
      type: 'execute',
      stmt: {
        sql: "SELECT value FROM discover_sync_state WHERE key = 'last_sync_at'",
        want_rows: true,
      },
    },
  ]);
  const cursor =
    cursorResults[0]?.response?.result?.rows?.[0]?.[0]?.value ?? '1970-01-01T00:00:00.000Z';

  const personas = db.prepare('SELECT * FROM synthetic_personas').all() as Record<
    string,
    unknown
  >[];
  const personaRequests = personas.map((row) =>
    execute(
      'INSERT INTO discover_personas(id,label,description,preferences_json) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,description=excluded.description,preferences_json=excluded.preferences_json',
      [row.id, row.label, row.description, row.preferences_json],
    ),
  );

  if (personaRequests.length > 0) {
    await pipeline(endpoint, token, personaRequests);
  }

  const games = db
    .prepare(
      'SELECT * FROM games WHERE updated_local_at > ? ORDER BY updated_local_at, universe_id',
    )
    .all(cursor) as Record<string, unknown>[];
  const snapshots = db
    .prepare(
      'SELECT * FROM game_metric_snapshots WHERE observed_at > ? ORDER BY observed_at, universe_id',
    )
    .all(cursor) as Record<string, unknown>[];
  let gamesSynced = 0;
  let snapshotsSynced = 0;

  for (let offset = 0; offset < games.length; offset += batchSize) {
    const batch = games.slice(offset, offset + batchSize);
    const requests: Array<Record<string, unknown>> = [execute('BEGIN IMMEDIATE')];

    for (const row of batch) {
      requests.push(
        execute(
          'INSERT INTO discover_games(universe_id,payload_json,updated_local_at) VALUES(?,?,?) ON CONFLICT(universe_id) DO UPDATE SET payload_json=excluded.payload_json,updated_local_at=excluded.updated_local_at WHERE excluded.updated_local_at >= discover_games.updated_local_at',
          [row.universe_id, JSON.stringify(row), row.updated_local_at],
        ),
      );
    }

    requests.push(execute('COMMIT'));
    await pipeline(endpoint, token, requests);
    gamesSynced += batch.length;
  }

  for (let offset = 0; offset < snapshots.length; offset += batchSize) {
    const batch = snapshots.slice(offset, offset + batchSize);
    const requests: Array<Record<string, unknown>> = [execute('BEGIN IMMEDIATE')];

    for (const row of batch) {
      requests.push(
        execute(
          'INSERT OR IGNORE INTO discover_metric_snapshots(universe_id,observed_at,source,payload_json) VALUES(?,?,?,?)',
          [row.universe_id, row.observed_at, row.source, JSON.stringify(row)],
        ),
      );
    }

    requests.push(execute('COMMIT'));
    await pipeline(endpoint, token, requests);
    snapshotsSynced += batch.length;
  }

  const latestSyncTime = games.reduce(
    (latest, row) =>
      String(row.updated_local_at) > latest ? String(row.updated_local_at) : latest,
    cursor,
  );

  await pipeline(endpoint, token, [
    execute(
      "INSERT INTO discover_sync_state(key,value) VALUES('last_sync_at',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      [latestSyncTime],
    ),
  ]);

  return {
    gamesSynced,
    snapshotsSynced,
    personasSynced: personas.length,
    lastSyncAt: latestSyncTime,
  };
}


function rowValue(value: { value?: string } | undefined): string | null {
  return value?.value ?? null;
}

function sqliteValue(value: unknown): string | number | bigint | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'boolean') return value ? 1 : 0;

  throw new Error(`Unsupported value in synchronized catalog: ${typeof value}`);
}

async function queryRows(endpoint: string, token: string, sql: string) {
  const results = await pipeline(endpoint, token, [
    { type: 'execute', stmt: { sql, want_rows: true } },
  ]);

  return results[0]?.response?.result?.rows ?? [];
}

/** Hydrates the API's local read model from the synchronized Turso catalog. */
export async function hydrateFromTurso(
  db: DatabaseSync,
  options: { url?: string; authToken?: string } = {},
) {
  const databaseUrl = options.url ?? process.env.TURSO_DATABASE_URL;
  const token = options.authToken ?? process.env.TURSO_AUTH_TOKEN;

  if (!databaseUrl || !token) throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required.');

  const endpoint = endpointFor(databaseUrl);
  const [gameRows, snapshotRows, personaRows] = await Promise.all([
    queryRows(endpoint, token, 'SELECT payload_json FROM discover_games ORDER BY universe_id'),
    queryRows(endpoint, token, 'SELECT payload_json FROM discover_metric_snapshots ORDER BY observed_at, universe_id'),
    queryRows(endpoint, token, 'SELECT id,label,description,preferences_json FROM discover_personas ORDER BY id'),
  ]);

  const games = gameRows.map((row) => JSON.parse(rowValue(row[0]) ?? '{}') as Record<string, unknown>);
  const snapshots = snapshotRows.map((row) => JSON.parse(rowValue(row[0]) ?? '{}') as Record<string, unknown>);
  const personas = personaRows.map((row) => ({
    id: rowValue(row[0]) ?? '',
    label: rowValue(row[1]) ?? '',
    description: rowValue(row[2]) ?? '',
    preferences_json: rowValue(row[3]) ?? '{}',
  }));

  const gameColumns = [
    'universe_id','place_id','title','description','creator','creator_id','creator_type','creator_verified',
    'genre','subgenre','tags_json','age_recommendation','max_players','voice_chat','camera','artwork_url','hero_url',
    'roblox_url','created_at','updated_at','source_created_at','source_updated_at','source_active_players',
    'source_favorites','source_visits','source_likes','source_dislikes','source_date_fetched','source_rating',
    'source_review_count','active_players','rating','review_count','average_playtime_minutes','weekly_change',
    'd1_retention','d7_retention','d30_retention','repeat_play_rate','average_session_minutes','synthetic_seed',
    'match_scores_json','source_status','first_seen_at','last_enriched_at','updated_local_at',
  ];
  const insertGame = db.prepare(
    `INSERT INTO games (${gameColumns.join(',')}) VALUES (${gameColumns.map(() => '?').join(',')})
     ON CONFLICT(universe_id) DO UPDATE SET ${gameColumns.filter((column) => column !== 'universe_id').map((column) => `${column}=excluded.${column}`).join(',')}`,
  );
  const insertSnapshot = db.prepare(
    `INSERT OR IGNORE INTO game_metric_snapshots (universe_id,observed_at,active_players,visits,favorites,rating,review_count,weekly_change,source)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  );
  const insertPersona = db.prepare(
    `INSERT INTO synthetic_personas(id,label,description,preferences_json) VALUES(?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET label=excluded.label,description=excluded.description,preferences_json=excluded.preferences_json`,
  );

  db.exec('BEGIN IMMEDIATE');

  try {
    db.exec('DELETE FROM game_metric_snapshots; DELETE FROM games;');

    for (const game of games) insertGame.run(...gameColumns.map((column) => sqliteValue(game[column])));

    for (const snapshot of snapshots) {
      insertSnapshot.run(
        ...[
          snapshot.universe_id,
          snapshot.observed_at,
          snapshot.active_players,
          snapshot.visits,
          snapshot.favorites,
          snapshot.rating,
          snapshot.review_count,
          snapshot.weekly_change ?? 0,
          snapshot.source,
        ].map(sqliteValue),
      );
    }

    for (const persona of personas) {
      insertPersona.run(persona.id, persona.label, persona.description, persona.preferences_json);
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return { gamesHydrated: games.length, snapshotsHydrated: snapshots.length, personasHydrated: personas.length };
}
