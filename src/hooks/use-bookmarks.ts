import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'discover:bookmarks';

function readBookmarks(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');

    return Array.isArray(value) && value.every((item): item is string => typeof item === 'string')
      ? value
      : [];
  } catch {
    return [];
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    setBookmarks(readBookmarks());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {
      // The UI remains usable when browser storage is unavailable.
    }
  }, [bookmarks, storageReady]);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  return { bookmarks, toggleBookmark };
}
