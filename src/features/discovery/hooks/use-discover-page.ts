import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBrowserLocation, navigateTo } from '@/hooks/use-browser-location';
import {
  isDefaultRankingConfiguration,
  type RankedExperience,
  type RankingConfiguration,
  type RankingContext,
} from '@/features/discovery/engine/ranking';
import {
  fetchCatalog,
  fetchDiscovery,
  fetchExperience,
  fetchPersonas,
  fetchGenreCounts,
  searchCatalog,
  type SearchSort,
} from '@/lib/api/discover-api';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useDiscoveryPreferences } from '@/features/discovery/preferences';
import { DISCOVERY_CONTEXTS, isSearchSort } from '@/config/discovery';
import {
  EXPERIENCE_GENRES,
  type DiscoveryPersona,
  type DiscoveryView,
  type Experience,
  type ExperienceGenre,
} from '@/types/experience';

const EMPTY_RANKED_SECTIONS: Record<RankingContext, RankedExperience[]> = {
  featured: [],
  trending: [],
  recommended: [],
  'hidden-gems': [],
  'recently-launched': [],
};

const PATH_TO_VIEW: Record<string, DiscoveryView> = {
  '/': 'explore',
  '/search': 'search',
  '/trending': 'trending',
  '/hidden-gems': 'hidden-gems',
  '/collections': 'collections',
  '/library': 'library',
};
const VIEW_TO_PATH: Record<DiscoveryView, string> = {
  explore: '/',
  search: '/search',
  trending: '/trending',
  'hidden-gems': '/hidden-gems',
  collections: '/collections',
  library: '/library',
};

export function useDiscoverPage(initialLocation = '/') {
  const browserLocation = useBrowserLocation(initialLocation);
  const [rawPathname, search = ''] = browserLocation.split('?');
  const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/+$/, '') : rawPathname;
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const activeView = PATH_TO_VIEW[pathname] ?? 'explore';
  const isGenreRoute = pathname.startsWith('/genre/');
  const [controlsOpen, setControlsOpen] = useState(
    () => new URLSearchParams(initialLocation.split('?')[1] ?? '').get('tune') === '1',
  );
  const { preferences, updatePreferences } = useDiscoveryPreferences();
  const rankingConfiguration = preferences.ranking;
  const setRankingConfiguration = useCallback(
    (ranking: RankingConfiguration) => {
      updatePreferences((current) => ({ ...current, ranking }));
    },
    [updatePreferences],
  );
  const requestedGenre = searchParams.get('genre');
  const pathGenre = pathname.startsWith('/genre/')
    ? EXPERIENCE_GENRES.find(
        (item) =>
          item.toLowerCase().replace(/[^a-z0-9]+/g, '-') ===
          pathname.slice('/genre/'.length),
      )
    : undefined;
  const genre: ExperienceGenre | 'All' =
    pathGenre ??
    (requestedGenre && EXPERIENCE_GENRES.includes(requestedGenre as ExperienceGenre)
      ? (requestedGenre as ExperienceGenre)
      : 'All');
  const query = searchParams.get('q') ?? '';
  const requestedSort = searchParams.get('sort');
  const searchSort: SearchSort = isSearchSort(requestedSort) ? requestedSort : 'relevance';
  const [personas, setPersonas] = useState<DiscoveryPersona[]>([]);
  const [genreCounts, setGenreCounts] = useState<Record<string, number>>({});
  const persona =
    preferences.personaId &&
    (personas.length === 0 || personas.some((item) => item.id === preferences.personaId))
      ? preferences.personaId
      : '';
  const { bookmarks, toggleBookmark } = useBookmarks();
  const [rankedSections, setRankedSections] = useState(EMPTY_RANKED_SECTIONS);
  const [visibleResults, setVisibleResults] = useState<Experience[]>([]);
  const [genreExperiences, setGenreExperiences] = useState<Experience[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [savedExperiences, setSavedExperiences] = useState<Experience[]>([]);
  const [collectionCatalog, setCollectionCatalog] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchGenreCounts(controller.signal)
      .then((result) => setGenreCounts(result.data))
      .catch(() => undefined);
    fetchPersonas(controller.signal)
      .then((result) => setPersonas(result.data))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;

        setError(cause instanceof Error ? cause.message : 'Unable to load play styles.');
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (personas.length === 0 || !preferences.personaId) return;
    if (!personas.some((item) => item.id === preferences.personaId)) {
      updatePreferences((current) => ({ ...current, personaId: null }));
    }
  }, [personas, preferences.personaId, updatePreferences]);

  useEffect(() => {
    if (searchParams.get('tune') !== '1') return;

    const nextUrl = new URL(window.location.href);

    nextUrl.searchParams.delete('tune');
    window.history.replaceState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }, [searchParams]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  useEffect(() => {
    if (isGenreRoute || activeView === 'search') return;
    const controller = new AbortController();
    let active = true;

    Promise.resolve()
      .then(() => {
        if (!active) return undefined;

        setLoading(true);
        setError(null);

        return Promise.all(
          DISCOVERY_CONTEXTS.map((context) =>
            fetchDiscovery(
              context,
              rankingConfiguration,
              genre,
              controller.signal,
              undefined,
              persona || undefined,
            ),
          ),
        );
      })
      .then((responses) => {
        if (!active || !responses) return;

        const next = Object.fromEntries(
          responses.map((response) => [response.context, response.results]),
        ) as Record<RankingContext, RankedExperience[]>;
        const featuredId = next.featured[0]?.experience.id;

        next.recommended = next.recommended
          .filter((item) => item.experience.id !== featuredId)
          .slice(0, 6)
          .map((item, index) => ({ ...item, position: index + 1 }));
        setRankedSections(next);
      })
      .catch((cause: unknown) => {
        if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;

        setError(cause instanceof Error ? cause.message : 'Unable to load discovery results.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeView, genre, persona, rankingConfiguration, isGenreRoute]);

  useEffect(() => {
    if (!isGenreRoute || genre === 'All') {
      setGenreExperiences([]);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);

    fetchCatalog(100, controller.signal, genre)
      .then((result) => {
        if (active) setGenreExperiences(result.data);
      })
      .catch((cause: unknown) => {
        if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;
        setError(cause instanceof Error ? cause.message : `Unable to load ${genre} experiences.`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [genre, isGenreRoute]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let debounce: number | undefined;

    Promise.resolve()
      .then(() => {
        if (!active) return;

        if (!query.trim()) {
          setVisibleResults([]);
          setSearchLoading(false);

          return;
        }

        setVisibleResults([]);
        setSearchLoading(true);
        setError(null);
        debounce = window.setTimeout(() => {
          searchCatalog(query, genre, searchSort, controller.signal)
            .then((results) => {
              if (active) setVisibleResults(results);
            })
            .catch((cause: unknown) => {
              if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;

              setError(cause instanceof Error ? cause.message : 'Search failed.');
            })
            .finally(() => {
              if (active) setSearchLoading(false);
            });
        }, 160);
      })
      .catch((cause: unknown) => {
        if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;

        setError(cause instanceof Error ? cause.message : 'Search failed.');
      });

    return () => {
      active = false;

      if (debounce !== undefined) window.clearTimeout(debounce);

      controller.abort();
    };
  }, [genre, query, searchSort]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    if (bookmarks.length === 0) {
      Promise.resolve()
        .then(() => {
          if (active) setSavedExperiences([]);
        })
        .catch((cause: unknown) => {
          if (!active) return;

          setError(cause instanceof Error ? cause.message : 'Unable to clear saved experiences.');
        });

      return () => {
        active = false;
        controller.abort();
      };
    }

    Promise.all(bookmarks.map((id) => fetchExperience(id, controller.signal).catch(() => null)))
      .then((items) => {
        if (active) setSavedExperiences(items.filter((item): item is Experience => item !== null));
      })
      .catch((cause: unknown) => {
        if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;

        setError(cause instanceof Error ? cause.message : 'Unable to load saved experiences.');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [bookmarks]);

  useEffect(() => {
    if (activeView !== 'collections') return;

    const controller = new AbortController();
    let active = true;

    fetchCatalog(500, controller.signal)
      .then((result) => {
        if (active) setCollectionCatalog(result.data);
      })
      .catch((cause: unknown) => {
        if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;

        setError(cause instanceof Error ? cause.message : 'Unable to load collections.');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeView]);

  const rankedRecommendations = useMemo(
    () => rankedSections.recommended.map((item) => item.experience),
    [rankedSections],
  );
  const hasCustomRanking = !isDefaultRankingConfiguration(rankingConfiguration);

  const updateQuery = useCallback(
    (next: string) => {
      const params = new URLSearchParams();

      if (next.trim()) params.set('q', next);

      if (genre !== 'All') params.set('genre', genre);

      if (searchSort !== 'relevance') params.set('sort', searchSort);

      if (next.trim()) navigateTo(`/search?${params.toString()}`, { replace: true });
      else if (pathname === '/search') {
        const params = new URLSearchParams();
        if (genre !== 'All') params.set('genre', genre);
        if (searchSort !== 'relevance') params.set('sort', searchSort);
        navigateTo(`/search${params.size ? `?${params}` : ''}`);
      }
    },
    [genre, pathname, searchSort],
  );

  const setSearchSort = useCallback(
    (next: SearchSort) => {
      const params = new URLSearchParams(searchParams);

      if (next === 'relevance') params.delete('sort');
      else params.set('sort', next);

      navigateTo(`${pathname}${params.size ? `?${params}` : ''}`, { replace: true });
    },
    [pathname, searchParams],
  );

  const setGenre = useCallback(
    (next: ExperienceGenre | 'All') => {
      const params = new URLSearchParams(searchParams);
      if (pathname === '/search') {
        if (next === 'All') params.delete('genre');
        else params.set('genre', next);
        navigateTo(`${pathname}${params.size ? `?${params}` : ''}`, { replace: true });
        return;
      }

      const slug = next === 'All' ? '' : `/genre/${next.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      navigateTo(slug || '/');
    },
    [pathname, searchParams],
  );

  const selectGenre = useCallback((next: ExperienceGenre | 'All') => {
    const destination =
      next === 'All' ? '/' : `/genre/${next.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    navigateTo(destination);
  }, []);

  const navigate = useCallback(
    (view: DiscoveryView) => {
      const destination = genre !== 'All' && view === 'explore'
        ? `/genre/${genre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        : VIEW_TO_PATH[view];
      navigateTo(destination);
    },
    [genre],
  );

  const setPersona = useCallback((next: string) => {
    updatePreferences((current) => ({ ...current, personaId: next || null }));
  }, [updatePreferences]);

  const closeControls = useCallback(() => setControlsOpen(false), []);

  return {
    activeView,
    controlsOpen,
    setControlsOpen,
    rankingConfiguration,
    setRankingConfiguration,
    genre,
    setGenre,
    selectGenre,
    personas,
    genreCounts,
    genreExperiences,
    isGenreRoute,
    persona,
    setPersona,
    bookmarks,
    toggleBookmark,
    query,
    visibleResults,
    searchSort,
    searchLoading,
    setSearchSort,
    rankedRecommendations,
    rankedSections,
    savedExperiences,
    collectionCatalog,
    hasCustomRanking,
    navigate,
    closeControls,
    setQuery: updateQuery,
    loading,
    error,
  };
}
