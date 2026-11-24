import type { Experience } from '../../types/experience';

export function sortSearchResults(experiences: Experience[], sort: string): Experience[] {
  const results = [...experiences];
  const timestamp = (value?: string) => {
    const parsed = Date.parse(value ?? '');
    return Number.isFinite(parsed) ? parsed : -1;
  };

  switch (sort) {
    case 'players':
      return results.sort(
        (a, b) => (b.metrics.activePlayers ?? -1) - (a.metrics.activePlayers ?? -1),
      );
    case 'rating':
      return results.sort((a, b) => (b.metrics.rating ?? -1) - (a.metrics.rating ?? -1));
    case 'reviews':
      return results.sort((a, b) => (b.metrics.voteCount ?? -1) - (a.metrics.voteCount ?? -1));
    case 'launched':
      return results.sort((a, b) => timestamp(b.publishedAt) - timestamp(a.publishedAt));
    case 'updated':
      return results.sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt));
    default:
      return results.sort(
        (a, b) =>
          (a.source?.nativePosition ?? Number.MAX_SAFE_INTEGER) -
          (b.source?.nativePosition ?? Number.MAX_SAFE_INTEGER),
      );
  }
}
