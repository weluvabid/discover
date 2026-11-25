import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const builtins = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);

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
        'live-server': 'src/server/live-index.ts',
        'live-app': 'src/server/api/live-app.ts',
      },
      external: (id) => builtins.has(id),
      output: {
        format: 'es',
        entryFileNames: '[name].mjs',
      },
    },
  },
});
