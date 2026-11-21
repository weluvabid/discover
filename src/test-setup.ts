import '@testing-library/jest-dom/vitest';

function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();

  return {
    get length() {
      return entries.size;
    },
    clear() {
      entries.clear();
    },
    getItem(key: string) {
      return entries.get(String(key)) ?? null;
    },
    key(index: number) {
      return Array.from(entries.keys())[index] ?? null;
    },
    removeItem(key: string) {
      entries.delete(String(key));
    },
    setItem(key: string, value: string) {
      entries.set(String(key), String(value));
    },
  };
}

// jsdom normally supplies localStorage. Install a deterministic in-memory
// implementation if the configured origin or test runner does not expose it.
let browserStorage: Storage | undefined;

if (typeof window !== 'undefined') {
  try {
    browserStorage = window.localStorage;
  } catch {
    browserStorage = undefined;
  }
}

if (typeof window !== 'undefined' && !browserStorage) {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: createMemoryStorage(),
  });
}
