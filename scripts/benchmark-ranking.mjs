import { performance } from 'node:perf_hooks';
import { experiences } from '../src/data/mocks/experiences.ts';
import {
  DEFAULT_RANKING_CONFIGURATION,
  rankForContext,
} from '../src/features/discovery/engine/ranking.ts';

const contexts = ['featured', 'trending', 'recommended', 'hidden-gems', 'recently-launched'];
const now = new Date();
const RUNS = 35;
const WARMUP_RUNS = 5;

function createSyntheticCatalog(size) {
  const base = experiences[0];
  if (!base) throw new Error('The mock catalog is empty.');

  const genres = ['Horror', 'Simulation', 'Action RPG', 'Exploration', 'Puzzle'];
  return Array.from({ length: size }, (_, index) => ({
    ...base,
    id: `benchmark-${String(index).padStart(6, '0')}`,
    genre: genres[index % genres.length],
    tags: [...base.tags, `tag-${index % 31}`],
    metrics: {
      ...base.metrics,
      activePlayers: 100 + ((index * 7919) % 120_000),
      rating: 70 + (index % 30),
      reviewCount: 100 + ((index * 97) % 50_000),
      weeklyChange: (index % 9) - 2,
      averagePlaytimeMinutes: 10 + (index % 80),
    },
    publishedAt: new Date(now.getTime() - (index % 90) * 86_400_000).toISOString(),
    matchScore: 50 + (index % 50),
  }));
}

function measure(catalog, context) {
  const options = { now, limit: context === 'featured' ? 1 : 8 };
  for (let index = 0; index < WARMUP_RUNS; index += 1) {
    rankForContext(catalog, DEFAULT_RANKING_CONFIGURATION, context, options);
  }

  const durations = [];
  for (let index = 0; index < RUNS; index += 1) {
    const start = performance.now();
    rankForContext(catalog, DEFAULT_RANKING_CONFIGURATION, context, options);
    durations.push(performance.now() - start);
  }

  durations.sort((left, right) => left - right);
  return {
    median: durations[Math.floor(durations.length * 0.5)],
    p95: durations[Math.floor(durations.length * 0.95)],
  };
}

const syntheticCatalog = createSyntheticCatalog(10_000);
for (const [label, catalog] of [
  [`Mock catalog (${experiences.length})`, experiences],
  ['Synthetic catalog (10,000)', syntheticCatalog],
]) {
  console.log(`\n${label}`);
  for (const context of contexts) {
    const { median, p95 } = measure(catalog, context);
    console.log(`${context.padEnd(18)} median ${median.toFixed(3)} ms · p95 ${p95.toFixed(3)} ms`);
  }
}
