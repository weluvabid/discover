import { openDatabase } from '../../src/deprecated/server/db/database';
import { syncToTurso } from '../../src/deprecated/server/turso-sync';

const db = openDatabase();

try {
  const stats = await syncToTurso(db);

  process.stdout.write(`Turso sync completed:\n${JSON.stringify(stats, null, 2)}\n`);
} catch (error) {
  console.error('Turso sync failed:', error);
  process.exitCode = 1;
} finally {
  db.close();
}
