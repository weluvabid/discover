/** Resolve a trusted HTTPS Roblox URL before opening an experience. */
export function resolveRobloxLaunchUrl(value: string | undefined): URL | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    const isRobloxHost = url.hostname === 'roblox.com' || url.hostname.endsWith('.roblox.com');

    if (url.protocol !== 'https:' || !isRobloxHost || url.username || url.password) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}
