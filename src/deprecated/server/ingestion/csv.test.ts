import { describe, expect, it } from 'vitest';
import { extractRobloxIds, parseCompactCount, parseCsv, parseSourceDate } from './csv';

async function* parseChunks(chunks: string[]) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }

      controller.close();
    },
  });

  for await (const record of parseCsv(stream)) {
    yield record;
  }
}

describe('CSV source normalization', () => {
  it('parses quoted commas, embedded newlines and escaped quotes across chunks', async () => {
    const records = [];

    for await (const record of parseChunks([
      'Title,Description\r\n"A, game","line one\nline',
      ' two with "',
      '"quotes"""',
    ])) {
      records.push(record.values);
    }

    expect(records).toEqual([
      { Title: 'A, game', Description: 'line one\nline two with "quotes"' },
    ]);
  });

  it('parses abbreviated counts as lower-bound estimates', () => {
    expect(parseCompactCount('2.8B+')).toBe(2_800_000_000);
    expect(parseCompactCount('124K+')).toBe(124_000);
    expect(parseCompactCount('N/A')).toBeNull();
    expect(parseCompactCount('0')).toBe(0);
  });

  it('requires both Roblox place and universe identifiers', () => {
    expect(
      extractRobloxIds(
        'https://www.roblox.com/games/7041939546/title?universeId=2711375305&amp;foo=bar',
      ),
    ).toEqual({ placeId: '7041939546', universeId: '2711375305' });
    expect(extractRobloxIds('https://example.com/games/1/title?universeId=2')).toBeNull();
  });

  it('parses source dates deterministically as UTC', () => {
    expect(parseSourceDate('11/5/2024 20:24')).toBe('2024-11-05T20:24:00.000Z');
  });
});
