import { describe, expect, it, vi } from 'vitest';
import { handleLiveRequest } from './live-app';
import type { RoTunnelClient } from './rotunnel';

describe('live API detail enrichment', () => {
  it('returns core experience details when optional votes and artwork fail', async () => {
    const client = {
      getDetails: vi.fn().mockResolvedValue(
        new Map([
          [
            '12345',
            {
              id: 12345,
              name: 'Test Experience',
              description: 'A test experience.',
              playing: 12,
              rootPlaceId: 54321,
            },
          ],
        ]),
      ),
      getVotes: vi.fn().mockRejectedValue(new Error('votes unavailable')),
      getIcons: vi.fn().mockRejectedValue(new Error('icons unavailable')),
    } as unknown as RoTunnelClient;

    const response = await handleLiveRequest(
      new Request('http://localhost/api/experiences/12345'),
      client,
    );
    const body = (await response.json()) as {
      id: string;
      title: string;
      metrics: { activePlayers?: number; rating?: number };
      artwork: { thumbnail: string };
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: '12345',
      title: 'Test Experience',
      metrics: { activePlayers: 12 },
      artwork: { thumbnail: '' },
    });
    expect(body.metrics.rating).toBeUndefined();
  });
});
