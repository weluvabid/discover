import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { navigateTo, useBrowserLocation } from './use-browser-location';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useBrowserLocation', () => {
  it('tracks same-route query updates without document navigation', () => {
    const { result } = renderHook(() => useBrowserLocation('/'));

    act(() => navigateTo('/?genre=Horror'));

    expect(result.current).toBe('/?genre=Horror');
  });

  it('delegates route changes to Astro navigation', async () => {
    const { result } = renderHook(() => useBrowserLocation('/'));

    act(() => navigateTo('/trending'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe('/trending');
  });

  it('tracks browser back and forward navigation', () => {
    const { result } = renderHook(() => useBrowserLocation('/'));

    act(() => navigateTo('/trending'));
    act(() => {
      window.history.replaceState(null, '', '/library');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current).toBe('/library');
  });
});
