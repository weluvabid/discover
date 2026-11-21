import { openDatabase } from '../src/server/db/database';
import { DEFAULT_CSV_URL, importCatalog } from '../src/server/ingestion/import-csv';
import { syncToTurso } from '../src/server/turso-sync';

const args = process.argv.slice(2);

function argumentValue(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const db = openDatabase();

try {
  const limitArgument = argumentValue('--limit');

  if (
    limitArgument !== undefined &&
    (!Number.isSafeInteger(Number(limitArgument)) || Number(limitArgument) < 1)
  ) {
    throw new Error('--limit must be a positive integer.');
  }

  const stats = await importCatalog(db, {
    url: argumentValue('--source') ?? DEFAULT_CSV_URL,
    limit: limitArgument ? Number(limitArgument) : undefined,
    enrich: !args.includes('--no-enrich'),
  });

  process.stdout.write(`Catalog ingestion completed:\n${JSON.stringify(stats, null, 2)}\n`);

  if (args.includes('--sync')) {
    const syncStats = await syncToTurso(db);
    process.stdout.write(`Turso sync completed:\n${JSON.stringify(syncStats, null, 2)}\n`);
  }
} catch (error) {
  console.error('Catalog ingestion failed:', error);
  process.exitCode = 1;
} finally {
  db.close();
}
