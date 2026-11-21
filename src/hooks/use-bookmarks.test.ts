import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBookmarks } from './use-bookmarks';

const storageKey = 'discover:bookmarks';

describe('useBookmarks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('restores saved experience IDs from local storage', () => {
    localStorage.setItem(storageKey, JSON.stringify(['deep-descent']));

    const { result } = renderHook(() => useBookmarks());

    expect(result.current.bookmarks).toEqual(['deep-descent']);
  });

  it('adds and removes bookmarks while persisting the result', () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.toggleBookmark('deep-descent'));

    expect(result.current.bookmarks).toEqual(['deep-descent']);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '[]')).toEqual(['deep-descent']);

    act(() => result.current.toggleBookmark('deep-descent'));

    expect(result.current.bookmarks).toEqual([]);
  });

  it('recovers from malformed stored data', () => {
    localStorage.setItem(storageKey, '{invalid');

    const { result } = renderHook(() => useBookmarks());

    expect(result.current.bookmarks).toEqual([]);
  });
});
