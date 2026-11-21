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

export function useBrowserLocation(serverSnapshot = '/') {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function navigateTo(url: string, options?: { replace?: boolean }) {
  if (options?.replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);

  window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
}
