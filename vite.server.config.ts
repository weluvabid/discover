import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const builtins = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
  'node:sqlite',
]);

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    ssr: true,
    outDir: 'dist-server',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        server: 'src/server/index.ts',
        'ranking-worker': 'src/server/ranking/worker.ts',
        'ingest-catalog': 'scripts/ingest-catalog.ts',
        'sync-turso': 'scripts/sync-turso.ts',
        'benchmark-api': 'scripts/benchmark-api.ts',
      },
      external: (id) => builtins.has(id),
      output: {
        format: 'es',
        entryFileNames: '[name].mjs',
      },
    },
  },
});
