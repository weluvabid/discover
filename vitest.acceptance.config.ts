import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.ts';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/server/api/local-catalog.acceptance.test.ts'],
      environment: 'node',
      setupFiles: [],
      fileParallelism: false,
    },
  }),
);
