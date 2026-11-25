import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearGenreCatalogueCache,
  genreCatalogueCounts,
  genreCatalogueFor,
  genreCataloguePage,
  selectGenreCatalogueSorts,
} from './genre-catalogue';
import type { NativeCandidate, NativeSort, RoTunnelClient } from '../providers/rotunnel/index';

function candidate(
  universeId: string,
  name: string,
  description: string,
  sortId: string,
): NativeCandidate {
  return {
    universeId,
    nativePosition: 1,
    sourceSortId: sortId,
    raw: { name, description },
  };
}

describe('genre catalogue', () => {
  beforeEach(() => {
    clearGenreCatalogueCache();
    vi.restoreAllMocks();
  });

  it('selects distinct feeds across useful native sort groups', () => {
    const sorts: NativeSort[] = [
      { id: 'trending', name: 'Top Trending', description: '' },
      { id: 'popular', name: 'Most Popular', description: '' },
      { id: 'new', name: 'New Experiences', description: '' },
      { id: 'updated', name: 'Recently Updated', description: '' },
      { id: 'more', name: 'Other Feed', description: '' },
    ];

    expect(selectGenreCatalogueSorts(sorts).map(({ id }) => id)).toEqual([
      'trending',
      'popular',
      'new',
      'updated',
      'more',
    ]);
  });

  it('prioritizes genre-relevant feeds and respects the configured feed limit', () => {
    const sorts: NativeSort[] = [
      { id: 'trending', name: 'Top Trending', description: '' },
      { id: 'survival', name: 'Top Survival Games', description: '' },
      { id: 'racing', name: 'Racing Games', description: '' },
      { id: 'adventure', name: 'Adventure Experiences', description: '' },
      { id: 'simulation', name: 'Simulation Sandbox', description: '' },
      ...Array.from({ length: 12 }, (_, index) => ({
        id: `other-${index}`,
        name: `Other Feed ${index}`,
        description: '',
      })),
    ];

    const selected = selectGenreCatalogueSorts(sorts);

    expect(selected.map(({ id }) => id)).toEqual([
      'trending',
      'survival',
      'racing',
      'adventure',
      'simulation',
      'other-0',
      'other-1',
      'other-2',
      'other-3',
      'other-4',
      'other-5',
      'other-6',
    ]);
  });

  it('merges feeds, deduplicates IDs and counts confident classifications', async () => {
    const sorts: NativeSort[] = [
      { id: 'trending', name: 'Top Trending', description: '' },
      { id: 'popular', name: 'Most Popular', description: '' },
    ];
    const client = {
      getSorts: vi.fn().mockResolvedValue(sorts),
      getDetails: vi.fn().mockResolvedValue(new Map()),
      getSortContent: vi.fn(async (sortId: string) =>
        sortId === 'trending'
          ? [
              candidate(
                '1',
                'Psychological Horror Escape',
                'Survive a psychological horror experience.',
                sortId,
              ),
              candidate('2', 'Racing Simulator', 'Race against other drivers on a track.', sortId),
              candidate('3', 'Unclear Game', 'Welcome to my game.', sortId),
            ]
          : [
              candidate('1', 'Duplicate Horror Experience', 'A horror game.', sortId),
              candidate('4', 'Co-op Survival Party', 'Team up in this co-op party game.', sortId),
            ],
      ),
    } as unknown as RoTunnelClient;

    const catalogue = await genreCatalogueFor(client);
    const counts = genreCatalogueCounts(catalogue);

    expect(client.getSortContent).toHaveBeenCalledTimes(2);
    expect(catalogue.total).toBe(4);
    expect(counts.Horror).toBe(1);
    expect(counts.Racing).toBe(1);
    expect(counts['Co-op']).toBe(1);
    expect(counts.All).toBe(3);
    expect(catalogue.diagnostics.uniqueCandidates).toBe(4);
    expect(catalogue.diagnostics.unknown).toBe(1);
    expect(catalogue.diagnostics.detailLookupCandidates).toBe(1);
    expect(client.getDetails).toHaveBeenCalledWith(['3']);
    expect(catalogue.diagnostics.failedFeeds).toEqual([]);
  });

  it('continues when one native feed fails and enriches only the requested page', async () => {
    const client = {
      getSorts: vi.fn().mockResolvedValue([
        { id: 'trending', name: 'Top Trending', description: '' },
        { id: 'popular', name: 'Most Popular', description: '' },
      ]),
      getDetails: vi.fn().mockResolvedValue(new Map()),
      getSortContent: vi.fn(async (sortId: string) => {
        if (sortId === 'popular') throw new Error('temporary upstream failure');

        return [candidate('10', 'Racing Simulator', 'Race against other drivers.', sortId)];
      }),
    } as unknown as RoTunnelClient;

    const page = await genreCataloguePage(client, 'Racing', 0, 1);

    expect(page.total).toBe(1);
    expect(page.candidates).toHaveLength(1);
    expect(page.candidates[0]?.universeId).toBe('10');
    const catalogue = await genreCatalogueFor(client);

    expect(catalogue.diagnostics.failedFeeds).toEqual(['popular']);
  });
});
