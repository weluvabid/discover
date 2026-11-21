import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'discover:bookmarks';
const EMPTY_BOOKMARKS: string[] = [];
const STORAGE_EVENT = 'storage';

let cachedBookmarks = EMPTY_BOOKMARKS;

function parseBookmarks(value: string | null): string[] {
  if (value === null) return EMPTY_BOOKMARKS;

  try {
    const parsed: unknown = JSON.parse(value);

    return Array.isArray(parsed) && parsed.every((item): item is string => typeof item === 'string')
      ? parsed
      : EMPTY_BOOKMARKS;
  } catch {
    return EMPTY_BOOKMARKS;
  }
}

function areEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function getSnapshot(): string[] {
  if (typeof window === 'undefined') return EMPTY_BOOKMARKS;

  try {
    const stored = parseBookmarks(window.localStorage.getItem(STORAGE_KEY));

    if (!areEqual(cachedBookmarks, stored)) cachedBookmarks = stored;
  } catch {
    // Keep the in-memory snapshot when browser storage is unavailable.
  }

  return cachedBookmarks;
}

function getServerSnapshot(): string[] {
  return EMPTY_BOOKMARKS;
}

function notifySubscribers(): void {
  window.dispatchEvent(new Event('discover:bookmarks-change'));
}

function subscribe(onStoreChange: () => void): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;

    getSnapshot();
    onStoreChange();
  };
  const handleLocalChange = () => onStoreChange();

  window.addEventListener(STORAGE_EVENT, handleStorageChange);
  window.addEventListener('discover:bookmarks-change', handleLocalChange);

  return () => {
    window.removeEventListener(STORAGE_EVENT, handleStorageChange);
    window.removeEventListener('discover:bookmarks-change', handleLocalChange);
  };
}

function updateBookmarks(updater: (current: string[]) => string[]): void {
  const next = updater(getSnapshot());

  if (areEqual(cachedBookmarks, next)) return;

  cachedBookmarks = next;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The UI remains usable when browser storage is unavailable.
  }

  notifySubscribers();
}

export function useBookmarks() {
  const bookmarks = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleBookmark = useCallback((id: string) => {
    updateBookmarks((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  return { bookmarks, toggleBookmark };
}
