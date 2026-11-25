import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoTunnelClient } from '../providers/rotunnel/index';
import {
  clearProviderResponseCache,
  detailsForIds,
  iconsForIds,
  votesForIds,
} from './provider-response-cache';

describe('provider response cache', () => {
  beforeEach(() => clearProviderResponseCache());

  it('reuses identical metadata batches across ranked views', async () => {
    const client = {
      getDetails: vi.fn().mockResolvedValue(new Map([['1', { name: 'One' }]])),
      getVotes: vi.fn().mockResolvedValue(new Map([['1', { upVotes: 10, downVotes: 1 }]])),
      getIcons: vi.fn().mockResolvedValue(new Map([['1', 'https://example.test/icon.png']])),
    } as unknown as RoTunnelClient;

    const first = await Promise.all([
      detailsForIds(client, ['1']),
      votesForIds(client, ['1']),
      iconsForIds(client, ['1']),
    ]);
    const second = await Promise.all([
      detailsForIds(client, ['1']),
      votesForIds(client, ['1']),
      iconsForIds(client, ['1']),
    ]);

    expect(first).toEqual(second);
    expect(client.getDetails).toHaveBeenCalledTimes(1);
    expect(client.getVotes).toHaveBeenCalledTimes(1);
    expect(client.getIcons).toHaveBeenCalledTimes(1);
  });
});
