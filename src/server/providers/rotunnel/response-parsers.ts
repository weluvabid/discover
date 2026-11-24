import type { JsonObject, NativeCandidate, NativeSort } from './types';

export const isRecord = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function stringValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();

    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }

  return undefined;
}

export function numericValue(...values: unknown[]): number | undefined {
  for (const value of values) {
    const number =
      typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;

    if (Number.isFinite(number) && number >= 0) return number;
  }

  return undefined;
}

function collectCandidateObjects(
  value: unknown,
  output: JsonObject[],
  seen: Set<object>,
  inheritedContentType?: string,
): void {
  if (!value || typeof value !== 'object' || seen.has(value)) return;

  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) collectCandidateObjects(item, output, seen, inheritedContentType);

    return;
  }

  const object = value as JsonObject;
  const contentType = stringValue(object.contentType, object.type, inheritedContentType);
  const contentId = /game|experience/i.test(contentType ?? '') ? object.contentId : undefined;
  const id = stringValue(object.universeId, object.universeID, object.universe_id, contentId);
  const title = stringValue(object.name, object.title, object.displayName);

  if (id && /^\d{1,20}$/.test(id) && title) output.push({ ...object, universeId: id });

  const childContentType =
    stringValue(object.contentGroupType, contentType) ?? inheritedContentType;

  // Explore and Omni Search have used different nesting envelopes over time.
  // Traverse object values rather than assuming one undocumented response shape.
  for (const [key, child] of Object.entries(object)) {
    if (
      [
        'games',
        'contents',
        'items',
        'experiences',
        'searchResults',
        'results',
        'data',
        'content',
      ].includes(key) ||
      (child && typeof child === 'object')
    ) {
      collectCandidateObjects(child, output, seen, childContentType);
    }
  }
}

export function extractCandidates(payload: unknown, sourceSortId: string): NativeCandidate[] {
  const objects: JsonObject[] = [];

  collectCandidateObjects(payload, objects, new Set());

  const unique = new Map<string, JsonObject>();

  for (const object of objects) {
    const contentType = stringValue(object.contentType, object.type);
    const contentId = /game|experience/i.test(contentType ?? '') ? object.contentId : undefined;
    const id = stringValue(object.universeId, object.universeID, object.universe_id, contentId);

    if (id && !unique.has(id)) unique.set(id, object);
  }

  return [...unique.entries()].map(([universeId, raw], index) => ({
    universeId,
    nativePosition: index + 1,
    sourceSortId,
    raw,
  }));
}

export function extractSorts(payload: unknown): NativeSort[] {
  const values: unknown[] = [];
  const seen = new Set<object>();

  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;

    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) visit(item);

      return;
    }

    const object = value as JsonObject;
    const id = stringValue(object.sortId, object.id, object.sort_id, object.token);
    const name = stringValue(object.sortDisplayName, object.displayName, object.name, object.title);

    if (id && name) values.push(object);
    else {
      for (const child of Object.values(object)) visit(child);
    }
  };

  visit(payload);

  const unique = new Map<string, NativeSort>();

  for (const value of values) {
    if (!isRecord(value)) continue;

    const id = stringValue(value.sortId, value.id, value.sort_id, value.token);
    const name = stringValue(value.sortDisplayName, value.displayName, value.name, value.title);

    if (!id || !name || unique.has(id)) continue;

    unique.set(id, {
      id,
      name,
      description: stringValue(value.description, value.subtitle) ?? '',
    });
  }

  return [...unique.values()];
}
