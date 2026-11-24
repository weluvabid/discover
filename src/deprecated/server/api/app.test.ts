import { describe, expect, it } from 'vitest';
import { handleApiRequest } from './app';

describe('deprecated database-backed API', () => {
  it('returns an explicit unsupported response without touching a database', async () => {
    const result = await handleApiRequest();

    expect(result).toEqual({
      status: 501,
      body: {
        error: 'The local-catalog API is unsupported. Use live Roblox discovery.',
        code: 'LEGACY_CATALOG_UNSUPPORTED',
      },
    });
  });
});
