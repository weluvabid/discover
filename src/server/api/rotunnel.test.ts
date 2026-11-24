import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeExperience,
  RoTunnelClient,
  selectSortForContext,
  type NativeCandidate,
} from './rotunnel';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RoTunnel provider contract', () => {
  it('parses the current Explore sorts envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          sorts: [
            { sortId: 'top-trending', sortDisplayName: 'Top Trending' },
            { sortId: 'up-and-coming', sortDisplayName: 'Up-and-Coming' },
          ],
        }),
      ),
    );

    const sorts = await new RoTunnelClient().getSorts();

    expect(sorts).toEqual([
      { id: 'top-trending', name: 'Top Trending', description: '' },
      { id: 'up-and-coming', name: 'Up-and-Coming', description: '' },
    ]);
  });

  it('fetches independent metadata batches concurrently and merges them in input order', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: URL) => {
      const ids = new URL(input).searchParams.get('universeIds')?.split(',') ?? [];
      return Response.json({ data: ids.map((id) => ({ id, name: `Experience ${id}` })) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const ids = Array.from({ length: 51 }, (_, index) => String(index + 1));
    const details = await new RoTunnelClient().getDetails(ids);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect([...details.keys()]).toEqual(ids);
  });

  it('falls back to the native trending sort when a context-specific sort is absent', () => {
    const sort = selectSortForContext(
      [{ id: 'top-trending', name: 'Top Trending', description: '' }],
      'hidden-gems',
    );

    expect(sort?.id).toBe('top-trending');
  });

  it('extracts ordered candidates from nested Explore content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          games: [
            { universeId: 123, name: 'First' },
            { universeId: 456, name: 'Second' },
          ],
        }),
      ),
    );

    const candidates = await new RoTunnelClient().getSortContent('top-trending');

    expect(candidates.map((item) => [item.universeId, item.nativePosition])).toEqual([
      ['123', 1],
      ['456', 2],
    ]);
  });

  it('follows bounded Omni Search pagination and preserves global native order', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          searchResults: [
            { contentGroupType: 'Game', contents: [{ contentId: '123', name: 'First result' }] },
          ],
          nextPageToken: 'next-page',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          searchResults: [
            { contentGroupType: 'Game', contents: [{ contentId: '456', name: 'Second result' }] },
          ],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const candidates = await new RoTunnelClient().search('obby');
    const secondUrl = new URL(fetchMock.mock.calls[1]?.[0] as URL);

    expect(candidates.map((candidate) => [candidate.universeId, candidate.nativePosition])).toEqual([
      ['123', 1],
      ['456', 2],
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(secondUrl.searchParams.get('pageToken')).toBe('next-page');
  });

  it('does not classify card-opening experiences as racing through substring matches', () => {
    const candidate: NativeCandidate = {
      universeId: 'card-opening',
      nativePosition: 1,
      sourceSortId: 'top-trending',
      raw: { name: 'My Little Pony Card Opening' },
    };

    const experience = normalizeExperience(
      candidate,
      {
        name: 'My Little Pony Card Opening',
        description: 'Open card packs and build a collection.',
      },
      undefined,
      undefined,
    );

    expect(experience.genre).not.toBe('Racing');
    expect(experience.genre).toBe('Simulation');
    expect(experience.genreConfidence).toBe('medium');
    expect(experience.tags).not.toContain('All');
  });

  it('still recognizes explicit racing terms as complete words', () => {
    const candidate: NativeCandidate = {
      universeId: 'racing',
      nativePosition: 1,
      sourceSortId: 'top-trending',
      raw: { name: 'Street Car Racing' },
    };

    const experience = normalizeExperience(
      candidate,
      { name: 'Street Car Racing' },
      undefined,
      undefined,
    );

    expect(experience.genre).toBe('Racing');
  });

  it('classifies specific Roblox concepts without treating incidental mentions as genres', () => {
    const cases = [
      { title: 'Illegal Chess', description: 'Play competitive chess.', expected: 'Puzzle' },
      {
        title: 'Zero Line [FPV DRONE KAMIKAZE]',
        description: 'Drone combat experience.',
        expected: 'Action RPG',
      },
      {
        title: 'Emergency Hamburg',
        description: 'Police, firefighters and emergency services roleplay in a city.',
        expected: 'Simulation',
      },
      {
        title: 'Drive Only Up! Car Obby',
        description: 'Climb an obstacle course.',
        expected: 'Puzzle',
      },
    ] as const;

    for (const [index, item] of cases.entries()) {
      const experience = normalizeExperience(
        {
          universeId: `genre-${index}`,
          nativePosition: index + 1,
          sourceSortId: 'top-trending',
          raw: { name: item.title },
        },
        {
          name: item.title,
          description: item.description,
          genre: 'providerGenre' in item ? item.providerGenre : 'All',
        },
        undefined,
        undefined,
      );
      expect(experience.genre, item.title).toBe(item.expected);
      expect(experience.subgenre, item.title).not.toBe('All');
      expect(experience.tags, item.title).not.toContain('All');
    }
  });

  it('uses meaningful native subgenres and specific live-feed mechanics', () => {
    const cases = [
      {
        title: 'BloxNG [CRASH PHYSICS]',
        subgenre: 'All',
        description: 'Realistic crash physics for cars with soft body deformation.',
        expected: 'Racing',
      },
      {
        title: 'Notoriety: A PAYDAY Experience',
        subgenre: 'FPS',
        providerGenre: 'Adventure',
        description: 'A first person co-op shooter with heists.',
        expected: 'Action RPG',
      },
      {
        title: 'Ant Evolution',
        subgenre: 'All',
        description: 'Evolve, bite bugs and battle other players.',
        expected: 'Action RPG',
      },
      {
        title: "Dandy's World",
        subgenre: 'All',
        description: 'A mascot horror survival multiplayer game.',
        expected: 'Horror',
      },
      {
        title: 'Moto Empire',
        subgenre: 'All',
        description: 'A high-speed motorcycle simulator with bikes and bike meets.',
        expected: 'Racing',
      },
      {
        title: 'Bikelife Poland',
        subgenre: 'All',
        description: 'Grab a dirt bike and ride through a small Polish town.',
        expected: 'Racing',
      },
      {
        title: 'DOWNHILL BIKING',
        subgenre: 'All',
        description: 'Bike down the mountain, send jumps and chase your best time.',
        expected: 'Racing',
      },
      {
        title: 'Can You Land A Plane?',
        subgenre: 'All',
        description: 'Land the jet, do flying jobs and earn new licenses.',
        expected: 'Simulation',
      },
      {
        title: 'Geometry Dash 2.2',
        subgenre: 'All',
        description: 'Jump, fly and flip to the beat through levels.',
        expected: 'Puzzle',
      },
      {
        title: 'KILLSTREAK',
        subgenre: 'FPS',
        description: 'An arcade first person shooter with gunplay.',
        expected: 'Action RPG',
      },
      {
        title: 'Flat the Mountain',
        subgenre: 'All',
        description: 'Dig the mountain and vacuum up stones.',
        expected: 'Simulation',
      },
      {
        title: 'Break and Steal',
        subgenre: 'All',
        description: 'Rob the vault, break into bases and steal items.',
        expected: 'Action RPG',
      },
      {
        title: 'Fling Arena',
        subgenre: 'All',
        description: 'Throw objects into other players to fling them off the map.',
        expected: 'Action RPG',
      },
      {
        title: 'Backseat Offroad',
        subgenre: 'All',
        description: 'Crawl old 4x4s over boulders, through rivers and snow.',
        expected: 'Simulation',
      },
      {
        title: 'Fish for Secret Animals',
        subgenre: 'All',
        description: 'Cast your line and catch rare fish across different biomes.',
        expected: 'Simulation',
      },
    ] as const;

    for (const [index, item] of cases.entries()) {
      const experience = normalizeExperience(
        {
          universeId: `live-genre-${index}`,
          nativePosition: index + 1,
          sourceSortId: 'top-trending',
          raw: { name: item.title, subgenre: item.subgenre },
        },
        {
          name: item.title,
          description: item.description,
          genre: 'providerGenre' in item ? item.providerGenre : 'All',
        },
        undefined,
        undefined,
      );
      expect(experience.genre, item.title).toBe(item.expected);
      expect(experience.genreConfidence, item.title).not.toBe('unknown');
      expect(experience.tags, item.title).not.toContain('All');
    }
  });

  it('keeps genuinely unclassified experiences distinct from Exploration for ranking', () => {
    const experience = normalizeExperience(
      {
        universeId: 'unknown',
        nativePosition: 1,
        sourceSortId: 'top-trending',
        raw: { name: 'A Thing' },
      },
      { name: 'A Thing', description: 'A fun experience.', genre: 'All', subgenre: 'All' },
      undefined,
      undefined,
    );

    expect(experience.genre).toBe('Exploration');
    expect(experience.genreConfidence).toBe('unknown');
    expect(experience.subgenre).toBe('Unclassified');
    expect(experience.tags).toEqual([]);
  });

  it('maps actual Roblox votes and metadata without inventing unavailable telemetry', () => {
    const candidate: NativeCandidate = {
      universeId: '123',
      nativePosition: 7,
      sourceSortId: 'top-trending',
      raw: { name: 'Test Experience' },
    };
    const experience = normalizeExperience(
      candidate,
      {
        id: 123,
        rootPlaceId: 456,
        name: 'Test Experience',
        description: 'An exploration game',
        creator: { name: 'Test Creator', hasVerifiedBadge: true },
        playing: 321,
        visits: 10_000,
        favoritedCount: 500,
        created: '2025-01-01T00:00:00.000Z',
        updated: '2025-02-01T00:00:00.000Z',
        genre: 'Adventure',
      },
      { id: 123, upVotes: 80, downVotes: 20 },
      'https://tr.rbxcdn.com/icon.png',
    );

    expect(experience).toMatchObject({
      id: '123',
      robloxUrl: 'https://www.roblox.com/games/456',
      title: 'Test Experience',
      creator: 'Test Creator',
      creatorVerified: true,
      metrics: {
        activePlayers: 321,
        rating: 80,
        voteCount: 100,
        visits: 10_000,
        favorites: 500,
      },
      source: { provider: 'rotunnel', sortId: 'top-trending', nativePosition: 7 },
    });
    expect(experience.metrics).not.toHaveProperty('averagePlaytimeMinutes');
    expect(experience.metrics).not.toHaveProperty('weeklyChange');
    expect(experience.metrics).not.toHaveProperty('d1Retention');
  });
});
