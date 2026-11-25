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

// cmdk measures its command list on mount. jsdom has no native ResizeObserver,
// so provide the minimal browser contract required by component tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverMock implements ResizeObserver {
    constructor(_callback: ResizeObserverCallback) {}

    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  globalThis.ResizeObserver = ResizeObserverMock;
}

// Base UI uses the Web Animations API to coordinate presence transitions.
// jsdom does not implement Element.getAnimations(), and tests do not need to
// inspect or wait for visual animations. Return an empty animation list.
if (typeof Element !== 'undefined' && !Element.prototype.getAnimations) {
  Element.prototype.getAnimations = function getAnimations(): Animation[] {
    return [];
  };
}

// cmdk scrolls the active command into view. jsdom does not implement this
// layout-dependent browser method, and scrolling is irrelevant to these tests.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {};
}
