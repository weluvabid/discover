import { describe, expect, it, vi } from 'vitest';
import { handleLiveRequest } from './live-app';
import type { NativeCandidate, RoTunnelClient } from './rotunnel';

function makeCandidate(id: string, position: number): NativeCandidate {
  return {
    universeId: id,
    nativePosition: position,
    sourceSortId: 'top-trending',
    raw: {
      universeId: id,
      name: `Experience ${id}`,
      playerCount: 1000 - position * 100,
      created: '2025-01-01T00:00:00.000Z',
    },
  };
}

function makeClient(candidates: NativeCandidate[]) {
  return {
    getSorts: vi
      .fn()
      .mockResolvedValue([
        { id: 'top-trending', name: 'Top Trending', description: 'Popular experiences' },
      ]),
    getSortContent: vi.fn().mockResolvedValue(candidates),
    getDetails: vi.fn().mockResolvedValue(new Map()),
    getVotes: vi.fn().mockResolvedValue(new Map()),
    getIcons: vi.fn().mockResolvedValue(new Map()),
    search: vi.fn().mockResolvedValue(candidates),
  } as unknown as RoTunnelClient;
}

describe('live Discover API', () => {
  it('preserves the response contract and original Roblox positions', async () => {
    const client = makeClient([makeCandidate('1001', 1), makeCandidate('1002', 2)]);
    const response = await handleLiveRequest(
      new Request('https://discover.example/api/discover/recommended', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 2 }),
      }),
      client,
    );
    const body = (await response.json()) as {
      context: string;
      persona: string | null;
      totalCandidates: number;
      results: Array<{
        experience: { id: string; source?: { nativePosition: number } };
        position: number;
      }>;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ context: 'recommended', persona: null, totalCandidates: 2 });
    expect(body.results).toHaveLength(2);
    expect(body.results.map((item) => item.position)).toEqual([1, 2]);
    expect(body.results.map((item) => item.experience.source?.nativePosition).sort()).toEqual([
      1, 2,
    ]);
    expect(client.getSortContent).toHaveBeenCalledWith('top-trending');
  });

  it('serves cacheable GET discovery results with ranking explanations', async () => {
    const client = makeClient([makeCandidate('1001', 1), makeCandidate('1002', 2)]);
    const response = await handleLiveRequest(
      new Request('https://discover.example/api/discover/recommended?limit=2&strategy=balanced'),
      client,
    );
    const body = (await response.json()) as {
      results: Array<{ score: number; explanation: { finalScore: number } }>;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=43200');
    expect(body.results).toHaveLength(2);
    expect(body.results[0]?.score).toBe(body.results[0]?.explanation.finalScore);
  });

  it('ranks search results by query relevance and returns explanations', async () => {
    const client = makeClient([
      { ...makeCandidate('1001', 1), raw: { name: 'Evade', description: 'Escape the enemy.' } },
      {
        ...makeCandidate('1002', 2),
        raw: { name: 'Other Experience', description: 'A different game.' },
      },
    ]);
    const response = await handleLiveRequest(
      new Request('https://discover.example/api/search?q=evade'),
      client,
    );
    const body = (await response.json()) as {
      rankedData: Array<{
        experience: { id: string };
        score: number;
        explanation: { signals: Array<{ id: string; normalizedScore: number }> };
      }>;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=43200');
    expect(body.rankedData[0]?.experience.id).toBe('1001');
    expect(
      body.rankedData[0]?.explanation.signals.find((signal) => signal.id === 'relevance')
        ?.normalizedScore,
    ).toBe(100);
  });

  it('rejects unknown persona and ranking controls instead of silently defaulting', async () => {
    const client = makeClient([]);
    const invalidPersona = await handleLiveRequest(
      new Request('https://discover.example/api/discover/recommended?persona=not-a-persona'),
      client,
    );
    const invalidStrategy = await handleLiveRequest(
      new Request('https://discover.example/api/search?q=test&strategy=not-a-strategy'),
      client,
    );
    const invalidGenre = await handleLiveRequest(
      new Request('https://discover.example/api/discover/recommended', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: 'not-a-genre' }),
      }),
      client,
    );

    expect(invalidPersona.status).toBe(400);
    expect(invalidStrategy.status).toBe(400);
    expect(invalidGenre.status).toBe(400);
    expect(client.getSortContent).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON and oversized request bodies', async () => {
    const client = makeClient([]);
    const malformed = await handleLiveRequest(
      new Request('https://discover.example/api/discover/recommended', {
        method: 'POST',
        body: '{',
      }),
      client,
    );
    const oversized = await handleLiveRequest(
      new Request('https://discover.example/api/discover/recommended', {
        method: 'POST',
        body: JSON.stringify({ note: 'x'.repeat(70_000) }),
      }),
      client,
    );

    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(client.getSortContent).not.toHaveBeenCalled();
  });

  it('rejects invalid contexts and limits before contacting RoTunnel', async () => {
    const client = makeClient([]);
    const unknown = await handleLiveRequest(
      new Request('https://discover.example/api/discover/not-real', { method: 'POST' }),
      client,
    );
    const invalidLimit = await handleLiveRequest(
      new Request('https://discover.example/api/discover/recommended', {
        method: 'POST',
        body: JSON.stringify({ limit: 101 }),
      }),
      client,
    );

    expect(unknown.status).toBe(404);
    expect(invalidLimit.status).toBe(400);
    expect(client.getSorts).not.toHaveBeenCalled();
  });

  it('serves health and personas without contacting RoTunnel', async () => {
    const client = makeClient([]);
    const health = await handleLiveRequest(
      new Request('https://discover.example/api/health'),
      client,
    );
    const personas = await handleLiveRequest(
      new Request('https://discover.example/api/personas'),
      client,
    );

    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: 'ok', provider: 'rotunnel' });
    expect(((await personas.json()) as { data: unknown[] }).data).toHaveLength(12);
    expect(client.getSorts).not.toHaveBeenCalled();
  });
});
