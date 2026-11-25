import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'astro:transitions/client': fileURLToPath(
        new URL('./src/test/astro-transitions.ts', import.meta.url),
      ),
      // Vercel entrypoints import a generated bundle in production; tests use source.
      '../dist-server/live-app.mjs': fileURLToPath(
        new URL('./src/server/api/live-app.ts', import.meta.url),
      ),
      '../../dist-server/live-app.mjs': fileURLToPath(
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
