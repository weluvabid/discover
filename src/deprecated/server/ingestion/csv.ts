export interface CsvRecord {
  rowNumber: number;
  values: Record<string, string>;
}

/** Streaming CSV reader supporting quoted commas, escaped quotes and multiline cells. */
export async function* parseCsv(stream: ReadableStream<Uint8Array>): AsyncGenerator<CsvRecord> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let field = '';
  let row: string[] = [];
  let quoted = false;
  let afterQuote = false;
  let headers: string[] | undefined;
  let rowNumber = 0;
  let first = true;
  let completed = false;

  const emit = (values: string[]) => {
    rowNumber += 1;

    if (!headers) {
      headers = values.map((value) => value.trim());

      return null;
    }

    return {
      rowNumber,
      values: Object.fromEntries(headers.map((key, index) => [key, values[index] ?? ''])),
    };
  };

  const process = function* (chunk: string): Generator<CsvRecord> {
    for (let index = 0; index < chunk.length; index += 1) {
      const character = chunk[index] ?? '';

      if (first) {
        first = false;

        if (character === '\uFEFF') continue;
      }

      if (quoted) {
        if (character === '"') {
          if (chunk[index + 1] === '"') {
            field += '"';
            index += 1;
          } else {
            quoted = false;
            afterQuote = true;
          }
        } else {
          field += character;
        }

        continue;
      }

      if (afterQuote) {
        if (character === '"') {
          // The closing quote was the first half of an escaped quote split across chunks.
          field += '"';
          quoted = true;
          afterQuote = false;
          continue;
        }

        if (character === ',') {
          row.push(field);
          field = '';
          afterQuote = false;
        } else if (character === '\n') {
          row.push(field);
          field = '';
          afterQuote = false;
          const record = emit(row);

          row = [];

          if (record) yield record;
        } else if (character !== '\r' && !/\s/.test(character)) {
          throw new Error(
            `Malformed CSV: unexpected character after quote at row ${rowNumber + 1}.`,
          );
        }

        continue;
      }

      if (character === '"' && field.length === 0) {
        quoted = true;
      } else if (character === ',') {
        row.push(field);
        field = '';
      } else if (character === '\n') {
        row.push(field);
        field = '';
        const record = emit(row);

        row = [];

        if (record) yield record;
      } else if (character !== '\r') {
        field += character;
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      for (const record of process(decoder.decode(value, { stream: true }))) {
        yield record;
      }
    }

    for (const record of process(decoder.decode())) {
      yield record;
    }

    if (quoted) {
      throw new Error(`Malformed CSV: unterminated quoted field near row ${rowNumber + 1}.`);
    }

    if (field.length > 0 || row.length > 0 || afterQuote) {
      row.push(field);
      const record = emit(row);

      if (record) yield record;
    }

    completed = true;
  } finally {
    if (!completed) await reader.cancel().catch(() => undefined);

    reader.releaseLock();
  }
}

export function parseCompactCount(raw: string): number | null {
  const value = raw.trim().replaceAll(',', '').replace(/\+$/, '');

  if (!value || /^(n\/a|na|null|-)$/i.test(value)) return null;

  const match = value.match(/^([\d.]+)\s*([KMB])?$/i);

  if (!match) return /^\d+$/.test(value) ? Number(value) : null;

  const suffix = (match[2] ?? '').toUpperCase();
  const multiplier = suffix === 'K' ? 1e3 : suffix === 'M' ? 1e6 : suffix === 'B' ? 1e9 : 1;
  const result = Number(match[1]) * multiplier;

  return Number.isSafeInteger(Math.round(result)) ? Math.round(result) : null;
}

export function extractRobloxIds(rawUrl: string): { placeId: string; universeId: string } | null {
  try {
    const url = new URL(rawUrl.trim().replaceAll('&amp;', '&'));
    const isRobloxHost = /(^|\.)roblox\.com$/i.test(url.hostname);

    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !isRobloxHost) {
      return null;
    }

    const placeId = url.pathname.match(/\/games\/(\d+)/)?.[1] ?? url.searchParams.get('placeId');
    const universeId = url.searchParams.get('universeId');

    if (!placeId || !universeId || !/^\d+$/.test(placeId) || !/^\d+$/.test(universeId)) {
      return null;
    }

    return { placeId, universeId };
  } catch {
    return null;
  }
}

export function parseSourceDate(raw: string): string | null {
  const value = raw.trim();

  if (!value) return null;

  const match = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?$/i,
  );

  if (match) {
    let hour = Number(match[4] ?? 0);
    const meridiem = match[6]?.toUpperCase();

    if (meridiem === 'PM' && hour < 12) hour += 12;

    if (meridiem === 'AM' && hour === 12) hour = 0;

    const date = new Date(
      Date.UTC(
        Number(match[3]),
        Number(match[1]) - 1,
        Number(match[2]),
        hour,
        Number(match[5] ?? 0),
      ),
    );

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
