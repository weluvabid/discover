import { navigate } from 'astro:transitions/client';
import { useSyncExternalStore } from 'react';

const LOCATION_CHANGE_EVENT = 'discover:location-change';

function subscribe(onStoreChange: () => void) {
  window.addEventListener('popstate', onStoreChange);
  window.addEventListener(LOCATION_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('popstate', onStoreChange);
    window.removeEventListener(LOCATION_CHANGE_EVENT, onStoreChange);
  };
}

function getSnapshot() {
  return `${window.location.pathname}${window.location.search}`;
}

function notifyLocationChange() {
  window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
}

export function useBrowserLocation(serverSnapshot = '/') {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

/**
 * Use Astro's router for document-route changes so ClientRouter owns the
 * navigation lifecycle. Same-path query updates remain history-only changes.
 */
export function navigateTo(url: string, options?: { replace?: boolean }) {
  const target = new URL(url, window.location.href);
  const current = new URL(window.location.href);

  if (target.origin !== current.origin) {
    window.location.assign(target.href);

    return;
  }

  if (target.pathname === current.pathname) {
    if (options?.replace) window.history.replaceState(null, '', target.href);
    else window.history.pushState(null, '', target.href);

    notifyLocationChange();

    return;
  }

  void navigate(target.href, { history: options?.replace ? 'replace' : 'push' }).then(
    notifyLocationChange,
    () => window.location.assign(target.href),
  );
}
