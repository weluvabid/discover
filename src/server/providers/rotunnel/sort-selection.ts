import type { NativeCandidate, NativeSort } from './types';

export function selectSortForContext(sorts: NativeSort[], context: string): NativeSort | undefined {
  const patterns: Record<string, RegExp[]> = {
    featured: [/featured|spotlight|top.playing.now/i, /top.trending/i],
    trending: [/top.trending|trending/i],
    recommended: [/recommended|for.you|personalized/i, /top.trending/i],
    'hidden-gems': [/up.and.coming|emerging|undiscovered|hidden/i],
    'recently-launched': [/new.experiences|newly.launched|recently.launched|up.and.coming/i],
  };
  const candidates = patterns[context] ?? [];

  for (const pattern of candidates) {
    const sort = sorts.find((item) => pattern.test(`${item.id} ${item.name} ${item.description}`));

    if (sort) return sort;
  }

  // Keep all existing contexts available when Roblox removes or renames a
  // dedicated sort. The selected source sort remains visible on each result.
  return sorts.find((item) => /top.trending|trending/i.test(`${item.id} ${item.name}`)) ?? sorts[0];
}

export function candidateIds(candidates: NativeCandidate[]): string[] {
  return [...new Set(candidates.map((candidate) => candidate.universeId))];
}
