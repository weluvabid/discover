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
