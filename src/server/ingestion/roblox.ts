export interface RobloxGame {
  id: number;
  rootPlaceId: number;
  name: string;
  description: string;
  creator: {
    id: number;
    name: string;
    type: string;
    hasVerifiedBadge?: boolean;
  };
  playing: number;
  visits: number;
  favoritedCount: number;
  maxPlayers: number;
  created: string;
  updated: string;
  genre: string;
  price: number | null;
}

export interface RobloxThumbnail {
  targetId: number;
  state: string;
  imageUrl?: string;
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal,
        headers: { 'User-Agent': 'RobloxDiscoverPortfolio/0.1' },
      });

      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(8000, 500 * 2 ** attempt);

        await wait(delay);
        continue;
      }

      if (!response.ok) {
        const error = new Error(`Roblox API ${response.status} for ${new URL(url).pathname}`);

        if (response.status >= 400 && response.status < 500) {
          throw Object.assign(error, { permanent: true });
        }

        throw error;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;

      if (signal?.aborted || (error && typeof error === 'object' && 'permanent' in error)) {
        throw error;
      }

      if (attempt < 4) await wait(Math.min(8000, 300 * 2 ** attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Roblox API request failed after retries.');
}

export async function fetchGameDetails(
  universeIds: string[],
  signal?: AbortSignal,
): Promise<Map<string, RobloxGame>> {
  if (universeIds.length === 0) return new Map();

  const query = universeIds.map(encodeURIComponent).join(',');
  const response = await fetchJson<{ data: RobloxGame[] }>(
    `https://games.roblox.com/v1/games?universeIds=${query}`,
    signal,
  );

  return new Map(response.data.map((game) => [String(game.id), game]));
}

export async function fetchGameIcons(
  universeIds: string[],
  signal?: AbortSignal,
): Promise<Map<string, string>> {
  if (universeIds.length === 0) return new Map();

  const query = universeIds.map(encodeURIComponent).join(',');
  const response = await fetchJson<{ data: RobloxThumbnail[] }>(
    `https://thumbnails.roblox.com/v1/games/icons?universeIds=${query}&size=512x512&format=Png&isCircular=false`,
    signal,
  );

  return new Map(
    response.data
      .filter((item) => item.state === 'Completed' && item.imageUrl)
      .map((item) => [String(item.targetId), item.imageUrl ?? '']),
  );
}
