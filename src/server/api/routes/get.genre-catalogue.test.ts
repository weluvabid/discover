import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleGet } from './get';
import { clearGenreCatalogueCache } from '../../services/genre-catalogue';
import type { RoTunnelClient } from '../../providers/rotunnel/index';

const sorts = [
  { id: 'trending', name: 'Top Trending', description: '' },
  { id: 'popular', name: 'Most Popular', description: '' },
];

describe('genre catalogue routes', () => {
  beforeEach(() => clearGenreCatalogueCache());

  it('returns genre counts from the merged native feeds', async () => {
    const client = {
      getSorts: vi.fn().mockResolvedValue(sorts),
      getDetails: vi.fn().mockResolvedValue(new Map()),
      getSortContent: vi.fn(async (sortId: string) => [
        {
          universeId: sortId === 'trending' ? '101' : '102',
          nativePosition: 1,
          sourceSortId: sortId,
          raw: {
            name: sortId === 'trending' ? 'Psychological Horror Escape' : 'Racing Simulator',
            description:
              sortId === 'trending'
                ? 'Survive a psychological horror experience.'
                : 'Race on a track against other drivers.',
          },
        },
      ]),
    } as unknown as RoTunnelClient;

    const response = await handleGet(client, new URL('http://localhost/api/genres'));
    const body = (await response.json()) as { data: Record<string, number> };

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ All: 2, Horror: 1, Racing: 1 });
  });

  it('serves a paginated genre catalogue and limits vote/icon enrichment to the requested page', async () => {
    const client = {
      getSorts: vi.fn().mockResolvedValue(sorts),
      getSortContent: vi.fn(async (sortId: string) => [
        {
          universeId: sortId === 'trending' ? '201' : '202',
          nativePosition: 1,
          sourceSortId: sortId,
          raw: { name: 'Psychological Horror Escape', description: 'Survive a horror game.' },
        },
      ]),
      getDetails: vi.fn().mockResolvedValue(new Map()),
      getVotes: vi.fn().mockResolvedValue(new Map()),
      getIcons: vi.fn().mockResolvedValue(new Map()),
    } as unknown as RoTunnelClient;

    const response = await handleGet(
      client,
      new URL('http://localhost/api/experiences?genre=Horror&limit=1&offset=1'),
    );
    const body = (await response.json()) as {
      data: Array<{ id: string }>;
      total: number;
      hasMore: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.total).toBe(2);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe('202');
    expect(body.hasMore).toBe(false);
    expect(client.getDetails).toHaveBeenCalledWith(['202']);
    expect(client.getVotes).toHaveBeenCalledWith(['202']);
    expect(client.getIcons).toHaveBeenCalledWith(['202']);
  });
});
