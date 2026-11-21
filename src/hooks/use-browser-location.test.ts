import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { navigateTo, useBrowserLocation } from './use-browser-location';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useBrowserLocation', () => {
  it('tracks in-app history updates', () => {
    const { result } = renderHook(() => useBrowserLocation('/'));

    act(() => navigateTo('/trending?genre=Horror'));

    expect(result.current).toBe('/trending?genre=Horror');
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
