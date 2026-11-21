// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBookmarks } from './use-bookmarks';

const storageKey = 'discover:bookmarks';

describe('useBookmarks', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('restores saved experience IDs from local storage', () => {
    window.localStorage.setItem(storageKey, JSON.stringify(['deep-descent']));

    const { result } = renderHook(() => useBookmarks());

    expect(result.current.bookmarks).toEqual(['deep-descent']);
  });

  it('adds and removes bookmarks while persisting the result', () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.toggleBookmark('deep-descent'));

    expect(result.current.bookmarks).toEqual(['deep-descent']);
    expect(JSON.parse(window.localStorage.getItem(storageKey) ?? '[]')).toEqual(['deep-descent']);

    act(() => result.current.toggleBookmark('deep-descent'));

    expect(result.current.bookmarks).toEqual([]);
  });

  it('recovers from malformed stored data', () => {
    window.localStorage.setItem(storageKey, '{invalid');

    const { result } = renderHook(() => useBookmarks());

    expect(result.current.bookmarks).toEqual([]);
  });
});
