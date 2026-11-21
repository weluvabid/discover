import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function readEnvFile(path) {
  if (!existsSync(path)) return {};

  const values = {};

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);

    if (!match || line.trimStart().startsWith('#')) continue;

    values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }

  return values;
}

const envFile = readEnvFile(resolve(process.cwd(), '.env'));
const databasePath = resolve(
  process.env.DATABASE_PATH ?? envFile.DATABASE_PATH ?? 'data/roblox-games.db',
);

if (!existsSync(databasePath)) {
  process.stderr.write(
    `Local catalog database not found: ${databasePath}\n` +
      'Set DATABASE_PATH or run the catalog ingestion before acceptance tests.\n',
  );
  process.exit(2);
}

process.stdout.write(`Running read-only acceptance tests against ${databasePath}\n`);
const result = spawnSync(
  'pnpm',
  ['exec', 'vitest', 'run', '--config', 'vitest.acceptance.config.ts'],
  {
    stdio: 'inherit',
    env: { ...envFile, ...process.env, DATABASE_PATH: databasePath },
  },
);

if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
  process.exit(2);
}

process.exit(result.status ?? 1);
