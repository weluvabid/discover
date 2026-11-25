import { describe, expect, it } from 'vitest';
import vercelHandler from '../../../api/[path]';

describe('Vercel API adapter', () => {
  it('forwards the original /api path to the shared live API handler', async () => {
    const response = await vercelHandler.fetch(
      new Request('https://discover.example/api/not-a-route'),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Not found.' });
  });

  it('handles preflight requests through the shared HTTP boundary', async () => {
    const response = await vercelHandler.fetch(
      new Request('https://discover.example/api/discover/trending', {
        method: 'OPTIONS',
        headers: { Origin: 'https://discover.example' },
      }),
    );

    expect(response.status).toBe(204);
  });

  it('preserves method validation from the shared HTTP boundary', async () => {
    const response = await vercelHandler.fetch(
      new Request('https://discover.example/api/discover/trending', {
        method: 'DELETE',
      }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, POST, OPTIONS');
  });
});
