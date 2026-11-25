export async function navigate(
  href: string,
  options?: { history?: 'auto' | 'push' | 'replace' },
): Promise<void> {
  if (options?.history === 'replace') window.history.replaceState(null, '', href);
  else window.history.pushState(null, '', href);

  window.dispatchEvent(new PopStateEvent('popstate'));
}
