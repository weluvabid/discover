import { describe, expect, it } from 'vitest';
import vercelHandler from '../../../api/discover/[context]';

describe('Vercel discovery API adapter', () => {
  it('forwards nested discovery paths to the shared live API handler', async () => {
    const response = await vercelHandler.fetch(
      new Request('https://discover.example/api/discover/not-a-context'),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Unknown discovery context.' });
  });

  it('handles preflight requests for nested discovery paths', async () => {
    const response = await vercelHandler.fetch(
      new Request('https://discover.example/api/discover/trending', {
        method: 'OPTIONS',
        headers: { Origin: 'https://discover.example' },
      }),
    );

    expect(response.status).toBe(204);
  });
});
