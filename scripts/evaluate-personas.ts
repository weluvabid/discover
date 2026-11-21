import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DEFAULT_RANKING_CONFIGURATION, filterEligibleCandidates, rankForContext } from '../src/features/discovery/engine/ranking';
import type { RankingContext } from '../src/features/discovery/engine/ranking';
import { seedPersonas } from '../src/server/ingestion/synthetic';
import { getCatalog } from '../src/server/ranking/catalog';

const databasePath = resolve(process.env.DATABASE_PATH ?? 'data/roblox-games.db');
const reportDirectory = resolve(process.env.PERSONA_REPORT_DIR ?? 'reports');
const limit = Number(process.env.PERSONA_EVALUATION_LIMIT ?? 40);
const now = process.env.PERSONA_EVALUATION_NOW
  ? new Date(process.env.PERSONA_EVALUATION_NOW)
  : new Date();
const contexts: RankingContext[] = [
  'featured',
  'trending',
  'recommended',
  'hidden-gems',
  'recently-launched',
];

if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
  throw new Error('PERSONA_EVALUATION_LIMIT must be an integer from 1 to 100.');
}

if (!Number.isFinite(now.getTime())) {
  throw new Error('PERSONA_EVALUATION_NOW must be a valid ISO date.');
}

const db = new DatabaseSync(databasePath, { readOnly: true, enableForeignKeyConstraints: true });

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percentage(numerator: number, denominator: number): number {
  return denominator ? (numerator / denominator) * 100 : 0;
}

function jaccard(left: Set<string>, right: Set<string>): number {
  let intersection = 0;

  for (const value of left) if (right.has(value)) intersection += 1;

  const union = left.size + right.size - intersection;

  return union ? intersection / union : 0;
}

function topGenres(items: Array<{ experience: { genre: string } }>) {
  const counts = new Map<string, number>();

  for (const item of items) counts.set(item.experience.genre, (counts.get(item.experience.genre) ?? 0) + 1);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([genre, count]) => ({ genre, count, share: percentage(count, items.length) }));
}

try {
  const catalog = getCatalog(db, { limit: 10_000 });

  if (!catalog.length) throw new Error(`No valid catalog records found in ${databasePath}.`);

  const personas = seedPersonas();
  const baseline = rankForContext(catalog, DEFAULT_RANKING_CONFIGURATION, 'recommended', { now, limit });
  const baselineIds = new Set(baseline.map((item) => item.experience.id));
  const evaluations = personas.map((persona) => {
    const personalizedCatalog = getCatalog(db, { limit: 10_000, persona: persona.id });
    const ranked = rankForContext(
      personalizedCatalog,
      DEFAULT_RANKING_CONFIGURATION,
      'recommended',
      { now, limit },
    );
    const preferred = new Set(persona.preferences);
    const preferredCount = ranked.filter((item) => preferred.has(item.experience.genre)).length;
    const baselinePreferredCount = baseline.filter((item) => preferred.has(item.experience.genre)).length;
    const contextEligibility = contexts.map((context) => ({
      context,
      eligibleCandidates: filterEligibleCandidates(personalizedCatalog, context, now).length,
      returned: rankForContext(personalizedCatalog, DEFAULT_RANKING_CONFIGURATION, context, {
        now,
        limit,
      }).length,
    }));

    return {
      id: persona.id,
      label: persona.label,
      preferences: persona.preferences,
      topResults: ranked.map((item) => ({
        id: item.experience.id,
        title: item.experience.title,
        genre: item.experience.genre,
        creator: item.experience.creator,
        matchScore: item.experience.matchScore ?? null,
        score: Number(item.score.toFixed(3)),
        position: item.position,
      })),
      metrics: {
        resultCount: ranked.length,
        preferredGenreCount: preferredCount,
        preferredGenreShare: percentage(preferredCount, ranked.length),
        baselinePreferredGenreShare: percentage(baselinePreferredCount, baseline.length),
        preferredGenreLiftPoints:
          percentage(preferredCount, ranked.length) - percentage(baselinePreferredCount, baseline.length),
        meanMatchScore: mean(ranked.map((item) => item.experience.matchScore ?? 0)),
        topGenres: topGenres(ranked),
        overlapWithBaseline: jaccard(
          new Set(ranked.map((item) => item.experience.id)),
          baselineIds,
        ),
        contextEligibility,
      },
    };
  });

  const resultSets = evaluations.map((evaluation) => ({
    id: evaluation.id,
    label: evaluation.label,
    ids: new Set(evaluation.topResults.map((item) => item.id)),
  }));
  const pairwiseOverlaps: Array<{ left: string; right: string; overlap: number }> = [];

  for (let left = 0; left < resultSets.length; left += 1) {
    for (let right = left + 1; right < resultSets.length; right += 1) {
      const a = resultSets[left];
      const b = resultSets[right];

      if (a && b) pairwiseOverlaps.push({ left: a.id, right: b.id, overlap: jaccard(a.ids, b.ids) });
    }
  }

  const allPersonaResultIds = new Set(evaluations.flatMap((evaluation) => evaluation.topResults.map((item) => item.id)));
  const meanPairwiseOverlap = mean(pairwiseOverlaps.map((item) => item.overlap));
  const maxPairwiseOverlap = Math.max(0, ...pairwiseOverlaps.map((item) => item.overlap));
  const summary = {
    generatedAt: new Date().toISOString(),
    evaluationClock: now.toISOString(),
    databasePath,
    catalogCount: catalog.length,
    personaCount: personas.length,
    resultLimit: limit,
    baseline: {
      resultCount: baseline.length,
      topResults: baseline.map((item) => ({ id: item.experience.id, title: item.experience.title, genre: item.experience.genre })),
      topGenres: topGenres(baseline),
    },
    aggregate: {
      uniqueGamesAcrossPersonas: allPersonaResultIds.size,
      possiblePersonaResultSlots: evaluations.reduce((sum, evaluation) => sum + evaluation.topResults.length, 0),
      meanPairwiseTopResultJaccard: meanPairwiseOverlap,
      maxPairwiseTopResultJaccard: maxPairwiseOverlap,
      meanPreferredGenreShare: mean(evaluations.map((evaluation) => evaluation.metrics.preferredGenreShare)),
      meanPreferredGenreLiftPoints: mean(evaluations.map((evaluation) => evaluation.metrics.preferredGenreLiftPoints)),
    },
    evaluations,
    pairwiseOverlaps: pairwiseOverlaps.map((item) => ({ ...item, overlap: Number(item.overlap.toFixed(4)) })),
  };

  const markdown = [
    '# Play-style recommendation evaluation',
    '',
    `Generated: ${summary.generatedAt}`,
    `Evaluation clock: ${summary.evaluationClock}`,
    `Catalog: ${summary.catalogCount.toLocaleString()} valid records (${databasePath})`,
    `Profiles: ${summary.personaCount} · Results per profile: ${limit}`,
    '',
    '## Overall results',
    '',
    `- Unique games across all profile result sets: **${summary.aggregate.uniqueGamesAcrossPersonas}** of ${summary.aggregate.possiblePersonaResultSlots} result slots.`,
    `- Mean pairwise top-result Jaccard overlap: **${(meanPairwiseOverlap * 100).toFixed(1)}%** (maximum ${(maxPairwiseOverlap * 100).toFixed(1)}%).`,
    `- Mean preferred-genre share: **${summary.aggregate.meanPreferredGenreShare.toFixed(1)}%**.`,
    `- Mean preferred-genre lift over the unpersonalized baseline: **${summary.aggregate.meanPreferredGenreLiftPoints >= 0 ? '+' : ''}${summary.aggregate.meanPreferredGenreLiftPoints.toFixed(1)} percentage points**.`,
    '',
    '## Profile results',
    '',
    '| Profile | Preferred genres | Preferred share | Baseline share | Lift | Mean match | Top genres |',
    '|---|---|---:|---:|---:|---:|---|',
    ...evaluations.map((evaluation) => {
      const genres = evaluation.metrics.topGenres.slice(0, 3).map((item) => `${item.genre} (${item.count})`).join(', ');
      const lift = evaluation.metrics.preferredGenreLiftPoints;

      return `| ${evaluation.label} | ${evaluation.preferences.join(', ')} | ${evaluation.metrics.preferredGenreShare.toFixed(1)}% | ${evaluation.metrics.baselinePreferredGenreShare.toFixed(1)}% | ${lift >= 0 ? '+' : ''}${lift.toFixed(1)} pp | ${evaluation.metrics.meanMatchScore.toFixed(1)} | ${genres || '—'} |`;
    }),
    '',
    '## Top results by profile',
    '',
    ...evaluations.flatMap((evaluation) => [
      `### ${evaluation.label}`,
      '',
      `Preferred genres: ${evaluation.preferences.join(', ')}. Top-result overlap with unpersonalized baseline: ${(evaluation.metrics.overlapWithBaseline * 100).toFixed(1)}%.`,
      '',
      '| # | Experience | Genre | Match | Score |',
      '|---:|---|---|---:|---:|',
      ...evaluation.topResults.map((item) => `| ${item.position} | ${item.title.replaceAll('|', '\\|')} | ${item.genre} | ${item.matchScore ?? '—'} | ${item.score.toFixed(2)} |`),
      '',
      'Context eligibility:',
      '',
      '| Context | Eligible catalog | Returned |',
      '|---|---:|---:|',
      ...evaluation.metrics.contextEligibility.map((item) => `| ${item.context} | ${item.eligibleCandidates} | ${item.returned} |`),
      '',
    ]),
    '## Interpretation',
    '',
    'This evaluation measures whether the current deterministic play-style scores change ranked results in the expected direction. Preferred-genre share and overlap describe ranking behavior; they are not measures of real player satisfaction or recommendation accuracy. The catalog match scores are synthetic inputs, not observed player preferences.',
    '',
  ].join('\n');

  mkdirSync(reportDirectory, { recursive: true });
  writeFileSync(resolve(reportDirectory, 'persona-evaluation.md'), markdown);
  writeFileSync(resolve(reportDirectory, 'persona-evaluation.json'), `${JSON.stringify(summary, null, 2)}\n`);

  process.stdout.write(
    `Persona evaluation complete\nCatalog: ${catalog.length}\nProfiles: ${personas.length}\nUnique games across profiles: ${allPersonaResultIds.size}\nMean pairwise top-${limit} overlap: ${(meanPairwiseOverlap * 100).toFixed(1)}%\nMean preferred-genre share: ${summary.aggregate.meanPreferredGenreShare.toFixed(1)}%\nMean lift over baseline: ${summary.aggregate.meanPreferredGenreLiftPoints >= 0 ? '+' : ''}${summary.aggregate.meanPreferredGenreLiftPoints.toFixed(1)} pp\nReports: ${resolve(reportDirectory, 'persona-evaluation.md')} and ${resolve(reportDirectory, 'persona-evaluation.json')}\n`,
  );
} finally {
  db.close();
}
