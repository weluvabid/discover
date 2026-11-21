import { spawn, spawnSync } from 'node:child_process';

const initialBuild = spawnSync('pnpm', ['api:build'], { stdio: 'inherit' });

if (initialBuild.status !== 0) {
  process.exit(initialBuild.status ?? 1);
}

const buildWatcher = spawn(
  'pnpm',
  ['exec', 'vite', 'build', '--watch', '--config', 'vite.server.config.ts'],
  { stdio: 'inherit' },
);
const apiServer = spawn(
  process.execPath,
  ['--watch', '--env-file-if-exists=.env', 'dist-server/server.mjs'],
  { stdio: 'inherit' },
);

const shutdown = () => {
  buildWatcher.kill('SIGTERM');
  apiServer.kill('SIGTERM');
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

buildWatcher.once('exit', (code) => {
  if (code && code !== 0) process.exitCode = code;

  apiServer.kill('SIGTERM');
});

apiServer.once('exit', (code) => {
  if (code && code !== 0) process.exitCode = code;

  buildWatcher.kill('SIGTERM');
});
