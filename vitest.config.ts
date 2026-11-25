import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The Vercel entrypoint imports a generated bundle in production.
      // Tests resolve that boundary to source so they do not depend on build output.
      '../dist-server/live-app.mjs': fileURLToPath(
        new URL('./src/server/api/live-app.ts', import.meta.url),
      ),
    },
  },
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      'src/deprecated/**',
    ],
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: ['./src/test-setup.ts'],
    restoreMocks: true,
  },
});
