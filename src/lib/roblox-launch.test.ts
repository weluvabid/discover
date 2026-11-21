import { describe, expect, it } from 'vitest';
import { resolveRobloxLaunchUrl } from './roblox-launch';

describe('resolveRobloxLaunchUrl', () => {
  it('accepts HTTPS URLs on Roblox domains', () => {
    expect(resolveRobloxLaunchUrl('https://www.roblox.com/games/123/example')?.hostname).toBe(
      'www.roblox.com',
    );
  });

  it('rejects missing, non-HTTPS, and non-Roblox URLs', () => {
    expect(resolveRobloxLaunchUrl(undefined)).toBeNull();
    expect(resolveRobloxLaunchUrl('http://www.roblox.com/games/123')).toBeNull();
    expect(resolveRobloxLaunchUrl('https://roblox.com.example.org/games/123')).toBeNull();
    expect(resolveRobloxLaunchUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects URLs containing credentials', () => {
    expect(resolveRobloxLaunchUrl('https://user:pass@www.roblox.com/games/123')).toBeNull();
  });
});
