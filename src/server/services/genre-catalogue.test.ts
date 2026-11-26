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

  it('combines category-targeted Omni Search results with native feeds', async () => {
    const client = {
      getSorts: vi.fn().mockResolvedValue([
        { id: 'trending', name: 'Top Trending', description: '' },
        { id: 'popular', name: 'Most Popular', description: '' },
      ]),
      getDetails: vi.fn().mockResolvedValue(new Map()),
      getSortContent: vi.fn(async (sortId: string) => [
        candidate('native-1', 'Trending Horror', 'A horror experience.', sortId),
      ]),
      search: vi.fn(async (query: string) => [
        candidate(
          `search-${query}`,
          `${query} Experience`,
          `A game about ${query}.`,
          'omni-search',
        ),
      ]),
    } as unknown as RoTunnelClient;

    const catalogue = await genreCatalogueFor(client);

    expect(client.search).toHaveBeenCalled();
    expect(client.search).toHaveBeenCalledWith('RPG', undefined, expect.any(String), 2);
    expect(client.search).toHaveBeenCalledWith('Racing', undefined, expect.any(String), 2);
    const sessions = new Set(
      vi.mocked(client.search).mock.calls.map(([, , sessionId]) => sessionId),
    );

    expect(sessions.size).toBe(1);
    expect(catalogue.diagnostics.searchQueries).toBe(7);
    expect(catalogue.diagnostics.failedSearches).toEqual([]);
    expect(catalogue.diagnostics.uniqueCandidates).toBeGreaterThan(2);
    expect([...catalogue.byGenre['Action RPG']].length).toBeGreaterThan(0);
  });

  it('acquires a persona-specific candidate pool while reusing cached query responses', async () => {
    const client = {
      getSorts: vi
        .fn()
        .mockResolvedValue([{ id: 'trending', name: 'Top Trending', description: '' }]),
      getDetails: vi.fn().mockResolvedValue(new Map()),
      getSortContent: vi
        .fn()
        .mockResolvedValue([
          candidate('native-1', 'Trending Experience', 'A popular game.', 'trending'),
        ]),
      search: vi.fn(async (query: string) => [
        candidate(
          `search-${query}`,
          `${query} Experience`,
          `A game about ${query}.`,
          'omni-search',
        ),
      ]),
    } as unknown as RoTunnelClient;

    const party = await genreCatalogueFor(client, 'party-player');
    const collector = await genreCatalogueFor(client, 'collector');
    const partyAgain = await genreCatalogueFor(client, 'party-player');
    const requestedQueries = vi.mocked(client.search).mock.calls.map(([query]) => query);

    expect(requestedQueries).toContain('Party Games');
    expect(requestedQueries).toContain('Multiplayer Minigames');
    expect(requestedQueries).toContain('Pet Collection Trading Games');
    expect(requestedQueries).toContain('Creature Collecting Games');
    expect(party).not.toBe(collector);
    expect(partyAgain).toBe(party);
    // Shared category searches are fetched once; each persona adds only its
    // own two cached Omni Search queries.
    expect(client.search).toHaveBeenCalledTimes(11);
    expect(party.diagnostics.searchQueries).toBe(9);
    expect(collector.diagnostics.searchQueries).toBe(9);
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
