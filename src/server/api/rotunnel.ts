import type { Experience } from '../../types/experience';
import {
  classifyGenre,
  firstMeaningfulLabel,
  meaningfulLabel,
} from '../../domain/taxonomy/genre-classifier';

const API_ORIGIN = 'https://apis.rotunnel.com';
const GAMES_ORIGIN = 'https://games.rotunnel.com';
const THUMBNAILS_ORIGIN = 'https://thumbnails.rotunnel.com';
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_RETRIES = 1;
const BATCH_SIZE = 50;

type JsonObject = Record<string, unknown>;

export interface NativeCandidate {
  universeId: string;
  nativePosition: number;
  sourceSortId: string;
  raw: JsonObject;
}

export interface NativeSort {
  id: string;
  name: string;
  description: string;
}

export class RoTunnelError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'RoTunnelError';
  }
}

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function stringValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();

    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }

  return undefined;
}

function numericValue(...values: unknown[]): number | undefined {
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

function extractCandidates(payload: unknown, sourceSortId: string): NativeCandidate[] {
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

function extractSorts(payload: unknown): NativeSort[] {
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

async function fetchJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

    try {
      const response = await fetch(url, {
        signal: requestSignal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        const retryAfter = Number(response.headers.get('retry-after'));

        if (retryable && attempt < MAX_RETRIES) {
          const delay = Number.isFinite(retryAfter)
            ? Math.min(750, Math.max(0, retryAfter * 1000))
            : 250;

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        await response.body?.cancel();
        throw new RoTunnelError(
          `RoTunnel returned HTTP ${response.status}.`,
          response.status,
          url.pathname,
        );
      }

      try {
        return (await response.json()) as T;
      } catch (cause) {
        throw new RoTunnelError('RoTunnel returned invalid JSON.', 502, url.pathname, { cause });
      }
    } catch (error) {
      lastError = error;

      if (signal?.aborted) throw error;

      if (error instanceof RoTunnelError && error.status < 500 && error.status !== 429) throw error;

      if (
        error instanceof DOMException &&
        (error.name === 'TimeoutError' || error.name === 'AbortError')
      ) {
        break;
      }

      if (attempt >= MAX_RETRIES) break;
    }
  }

  if (lastError instanceof RoTunnelError) throw lastError;

  throw new RoTunnelError(
    'Unable to reach RoTunnel.',
    502,
    url.pathname,
    lastError instanceof Error ? { cause: lastError } : undefined,
  );
}

function sessionId(): string {
  return globalThis.crypto.randomUUID();
}

async function fetchBatchedMap<T>(
  universeIds: string[],
  createUrl: (batch: string[]) => URL,
  readEntry: (item: JsonObject) => readonly [string, T] | undefined,
  signal?: AbortSignal,
): Promise<Map<string, T>> {
  const batches: string[][] = [];

  for (let offset = 0; offset < universeIds.length; offset += BATCH_SIZE) {
    batches.push(universeIds.slice(offset, offset + BATCH_SIZE));
  }

  // A feed is capped at 100 candidates, so this fan-out is bounded to two
  // requests per endpoint. Promise.all preserves batch order in the merge.
  const payloads = await Promise.all(
    batches.map((batch) => fetchJson<unknown>(createUrl(batch), signal)),
  );
  const results = new Map<string, T>();

  for (const payload of payloads) {
    const items = isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];

    for (const item of items) {
      if (!isRecord(item)) continue;

      const entry = readEntry(item);

      if (entry) results.set(entry[0], entry[1]);
    }
  }

  return results;
}

export class RoTunnelClient {
  async getSorts(signal?: AbortSignal): Promise<NativeSort[]> {
    const url = new URL('/explore-api/v1/get-sorts', API_ORIGIN);

    url.search = new URLSearchParams({
      sessionId: sessionId(),
      device: 'computer',
      country: 'all',
    }).toString();

    return extractSorts(await fetchJson<unknown>(url, signal));
  }

  async getSortContent(sortId: string, signal?: AbortSignal): Promise<NativeCandidate[]> {
    const url = new URL('/explore-api/v1/get-sort-content', API_ORIGIN);

    url.search = new URLSearchParams({
      sessionId: sessionId(),
      sortId,
      device: 'computer',
      country: 'all',
      maxRows: '100',
    }).toString();

    return extractCandidates(await fetchJson<unknown>(url, signal), sortId);
  }

  async search(query: string, signal?: AbortSignal): Promise<NativeCandidate[]> {
    const url = new URL('/search-api/omni-search', API_ORIGIN);
    const session = sessionId();
    const candidates = new Map<string, NativeCandidate>();
    let pageToken: string | undefined;

    // Search exposes a continuation token. Bound pagination to three pages so
    // one query cannot consume unbounded request time or upstream quota.
    for (let page = 0; page < 3; page += 1) {
      const params = new URLSearchParams({
        SearchQuery: query,
        SessionId: session,
        pageType: 'all',
      });

      if (pageToken) params.set('pageToken', pageToken);

      url.search = params.toString();

      const payload = await fetchJson<unknown>(url, signal);
      const pageCandidates = extractCandidates(payload, 'omni-search');

      for (const candidate of pageCandidates) {
        if (candidates.has(candidate.universeId)) continue;

        candidates.set(candidate.universeId, {
          ...candidate,
          nativePosition: candidates.size + 1,
        });
      }

      pageToken = isRecord(payload)
        ? stringValue(payload.nextPageToken, payload.nextPageCursor)
        : undefined;

      if (!pageToken) break;
    }

    return [...candidates.values()];
  }

  async getDetails(universeIds: string[], signal?: AbortSignal): Promise<Map<string, JsonObject>> {
    return fetchBatchedMap(
      universeIds,
      (batch) => {
        const url = new URL('/v1/games', GAMES_ORIGIN);

        url.searchParams.set('universeIds', batch.join(','));

        return url;
      },
      (item) => {
        const id = stringValue(item.id, item.universeId);

        return id ? [id, item] : undefined;
      },
      signal,
    );
  }

  async getVotes(universeIds: string[], signal?: AbortSignal): Promise<Map<string, JsonObject>> {
    return fetchBatchedMap(
      universeIds,
      (batch) => {
        const url = new URL('/v1/games/votes', GAMES_ORIGIN);

        url.searchParams.set('universeIds', batch.join(','));

        return url;
      },
      (item) => {
        const id = stringValue(item.id, item.universeId);

        return id ? [id, item] : undefined;
      },
      signal,
    );
  }

  async getIcons(universeIds: string[], signal?: AbortSignal): Promise<Map<string, string>> {
    return fetchBatchedMap(
      universeIds,
      (batch) => {
        const url = new URL('/v1/games/icons', THUMBNAILS_ORIGIN);

        url.search = new URLSearchParams({
          universeIds: batch.join(','),
          size: '512x512',
          format: 'Png',
          isCircular: 'false',
        }).toString();

        return url;
      },
      (item) => {
        const id = stringValue(item.targetId, item.universeId);
        const imageUrl = stringValue(item.imageUrl);

        return id && imageUrl && item.state !== 'Blocked' ? [id, imageUrl] : undefined;
      },
      signal,
    );
  }
}

export function normalizeExperience(
  candidate: NativeCandidate,
  detail: JsonObject,
  votes: JsonObject | undefined,
  icon: string | undefined,
): Experience {
  const creator = isRecord(detail.creator) ? detail.creator : {};
  const title =
    stringValue(detail.name, candidate.raw.name, candidate.raw.title) ??
    `Experience ${candidate.universeId}`;
  const description = stringValue(detail.description, candidate.raw.description) ?? '';
  const nativeGenre = firstMeaningfulLabel(
    detail.genre,
    detail.genreName,
    candidate.raw.genre,
    candidate.raw.genreName,
  );
  const rawSubgenre = meaningfulLabel(stringValue(candidate.raw.subgenre));
  const classification = classifyGenre({
    nativeGenre: rawSubgenre ?? nativeGenre,
    title,
    description,
  });
  const { genre } = classification;
  const created = stringValue(detail.created, detail.createdAt, candidate.raw.created);
  const updated = stringValue(detail.updated, detail.updatedAt, candidate.raw.updated);
  const upVotes = numericValue(votes?.upVotes, votes?.upvotes);
  const downVotes = numericValue(votes?.downVotes, votes?.downvotes);
  const voteCount =
    upVotes !== undefined && downVotes !== undefined ? upVotes + downVotes : undefined;
  const rating =
    voteCount !== undefined && voteCount > 0 && upVotes !== undefined
      ? (upVotes / voteCount) * 100
      : undefined;
  const activePlayers = numericValue(detail.playing, detail.playerCount, candidate.raw.playerCount);
  const rootPlaceId = stringValue(
    detail.rootPlaceId,
    detail.placeId,
    candidate.raw.rootPlaceId,
    candidate.raw.placeId,
  );
  const rawCreator = isRecord(candidate.raw.creator) ? candidate.raw.creator : {};
  const creatorName =
    stringValue(creator.name, detail.creatorName, rawCreator.name, candidate.raw.creatorName) ??
    'Unknown creator';
  const favorites = numericValue(detail.favoritedCount, detail.favorites);
  const visits = numericValue(detail.visits);
  const inferredGenreTag =
    classification.confidence === 'high' || classification.confidence === 'medium'
      ? genre
      : undefined;
  const tags = [
    ...new Set(
      [nativeGenre, rawSubgenre, inferredGenreTag].filter((tag): tag is string => Boolean(tag)),
    ),
  ];
  const experience: Experience = {
    id: candidate.universeId,
    ...(rootPlaceId ? { robloxUrl: `https://www.roblox.com/games/${rootPlaceId}` } : {}),
    title,
    description,
    creator: creatorName,
    creatorVerified: creator.hasVerifiedBadge === true,
    genre,
    genreConfidence: classification.confidence,
    subgenre:
      nativeGenre ??
      rawSubgenre ??
      (classification.confidence === 'unknown' ? 'Unclassified' : genre),
    artwork: {
      thumbnail: icon ?? '',
      alt: `${title} Roblox experience artwork`,
    },
    metrics: {
      ...(activePlayers !== undefined ? { activePlayers } : {}),
      ...(rating !== undefined ? { rating } : {}),
      ...(voteCount !== undefined ? { voteCount } : {}),
      ...(favorites !== undefined ? { favorites } : {}),
      ...(visits !== undefined ? { visits } : {}),
    },
    ...(created ? { publishedAt: created } : {}),
    ...(updated ? { updatedAt: updated } : {}),
    tags,
    source: {
      provider: 'rotunnel',
      sortId: candidate.sourceSortId,
      nativePosition: candidate.nativePosition,
    },
  };

  return experience;
}

export function selectSortForContext(sorts: NativeSort[], context: string): NativeSort | undefined {
  const patterns: Record<string, RegExp[]> = {
    featured: [/featured|spotlight|top.playing.now/i, /top.trending/i],
    trending: [/top.trending|trending/i],
    recommended: [/recommended|for.you|personalized/i, /top.trending/i],
    'hidden-gems': [/up.and.coming|emerging|undiscovered|hidden/i],
    'recently-launched': [/new.experiences|newly.launched|recently.launched|up.and.coming/i],
  };
  const candidates = patterns[context] ?? [];

  for (const pattern of candidates) {
    const sort = sorts.find((item) => pattern.test(`${item.id} ${item.name} ${item.description}`));

    if (sort) return sort;
  }

  // Keep all existing contexts available when Roblox removes or renames a
  // dedicated sort. The selected source sort remains visible on each result.
  return sorts.find((item) => /top.trending|trending/i.test(`${item.id} ${item.name}`)) ?? sorts[0];
}

export function candidateIds(candidates: NativeCandidate[]): string[] {
  return [...new Set(candidates.map((candidate) => candidate.universeId))];
}
