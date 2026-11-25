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

const EMPTY_EXPERIENCES: Experience[] = [];
const EMPTY_GENRE_RANKING = new Map<string, RankedExperience>();
const CATALOGUE_PAGE_SIZE = 24;

const EMPTY_RANKED_SECTIONS: Record<RankingContext, RankedExperience[]> = {
  featured: [],
  trending: [],
  recommended: [],
  'hidden-gems': [],
  'recently-launched': [],
};

const PATH_TO_VIEW: Record<string, DiscoveryView> = {
  '/': 'explore',
  '/all': 'all',
  '/search': 'search',
  '/trending': 'trending',
  '/hidden-gems': 'hidden-gems',
  '/library': 'library',
};
const VIEW_TO_PATH: Record<DiscoveryView, string> = {
  explore: '/',
  all: '/all',
  search: '/search',
  trending: '/trending',
  'hidden-gems': '/hidden-gems',
  library: '/library',
};

export function useDiscoverPage(initialLocation = '/') {
  const browserLocation = useBrowserLocation(initialLocation);
  const [rawPathname] = browserLocation.split('?');
  const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/+$/, '') : rawPathname;
  const searchParams = useMemo(
    () => new URLSearchParams(browserLocation.split('?')[1] ?? ''),
    [browserLocation],
  );
  const activeView = PATH_TO_VIEW[pathname] ?? 'explore';
  const isExploreRoute = pathname === '/';
  const isGenreRoute = pathname.startsWith('/genre/');
  const isAllCatalogueRoute = pathname === '/all';
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
          item.toLowerCase().replace(/[^a-z0-9]+/g, '-') === pathname.slice('/genre/'.length),
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
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);
  const [allRankingById, setAllRankingById] = useState<Map<string, RankedExperience>>(new Map());
  const [allHasMore, setAllHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [genreRankingById, setGenreRankingById] = useState<Map<string, RankedExperience>>(
    new Map(),
  );
  const [searchRankingById, setSearchRankingById] = useState<Map<string, RankedExperience>>(
    new Map(),
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [savedExperiences, setSavedExperiences] = useState<Experience[]>([]);
  const [savedExperiencesLoading, setSavedExperiencesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [discoveryRefreshVersion, setDiscoveryRefreshVersion] = useState(0);

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
  }, [retryVersion]);

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
    if (
      isGenreRoute ||
      isAllCatalogueRoute ||
      (activeView !== 'explore' && activeView !== 'trending' && activeView !== 'hidden-gems')
    ) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    Promise.resolve()
      .then(() => {
        if (!active) return undefined;

        setLoading(true);
        setError(null);

        const contexts: readonly RankingContext[] =
          activeView === 'trending'
            ? ['trending']
            : activeView === 'hidden-gems'
              ? ['hidden-gems']
              : DISCOVERY_CONTEXTS;

        return Promise.all(
          contexts.map((context) =>
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
        ) as Partial<Record<RankingContext, RankedExperience[]>>;

        if (activeView === 'explore') {
          const featuredId = next.featured?.[0]?.experience.id;
          const recommended = (next.recommended ?? []).filter(
            (item) => item.experience.id !== featuredId,
          );

          next.recommended = recommended
            .slice(0, 6)
            .map((item, index) => ({ ...item, position: index + 1 }));
        }

        setRankedSections((current) => {
          const updated = { ...current };

          for (const response of responses) {
            updated[response.context] = next[response.context] ?? response.results;
          }

          return updated;
        });
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
  }, [
    activeView,
    genre,
    persona,
    rankingConfiguration,
    isGenreRoute,
    isAllCatalogueRoute,
    discoveryRefreshVersion,
    retryVersion,
  ]);

  useEffect(() => {
    if (!isAllCatalogueRoute) return;

    const controller = new AbortController();
    let active = true;

    Promise.resolve()
      .then(() => {
        if (!active) return undefined;

        setLoading(true);
        setError(null);
        setAllExperiences([]);
        setAllRankingById(new Map());
        setAllHasMore(false);

        return fetchCatalog(
          CATALOGUE_PAGE_SIZE,
          controller.signal,
          'All',
          0,
          rankingConfiguration,
          persona || undefined,
        );
      })
      .then((result) => {
        if (!active || !result) return;

        setAllExperiences(result.data);
        setAllRankingById(
          new Map((result.rankedData ?? []).map((item) => [item.experience.id, item])),
        );
        setAllHasMore(result.hasMore ?? result.offset + result.data.length < result.total);
      })
      .catch((cause: unknown) => {
        if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;

        setError(
          cause instanceof Error ? cause.message : 'Unable to load the experience catalogue.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isAllCatalogueRoute, rankingConfiguration, persona, retryVersion]);

  const loadMoreCatalogue = useCallback(async () => {
    if (!isAllCatalogueRoute || loadingMore || !allHasMore) return;

    const controller = new AbortController();

    setLoadingMore(true);

    try {
      const result = await fetchCatalog(
        CATALOGUE_PAGE_SIZE,
        controller.signal,
        'All',
        allExperiences.length,
        rankingConfiguration,
        persona || undefined,
      );

      setAllExperiences((current) => {
        const existing = new Set(current.map((item) => item.id));

        return [...current, ...result.data.filter((item) => !existing.has(item.id))];
      });
      setAllRankingById((current) => {
        const next = new Map(current);

        for (const item of result.rankedData ?? []) next.set(item.experience.id, item);

        return next;
      });
      setAllHasMore(result.hasMore ?? result.offset + result.data.length < result.total);
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : 'Unable to load more experiences.');
      }
    } finally {
      setLoadingMore(false);
    }
  }, [
    isAllCatalogueRoute,
    loadingMore,
    allHasMore,
    allExperiences.length,
    rankingConfiguration,
    persona,
  ]);

  useEffect(() => {
    if (!isGenreRoute || genre === 'All') return;

    const controller = new AbortController();
    let active = true;

    Promise.resolve()
      .then(() => {
        if (!active) return undefined;

        setLoading(true);
        setError(null);

        return fetchCatalog(
          100,
          controller.signal,
          genre,
          0,
          rankingConfiguration,
          persona || undefined,
        );
      })
      .then((result) => {
        if (!result) return;

        if (active) {
          setGenreExperiences(result.data);
          setGenreRankingById(
            new Map((result.rankedData ?? []).map((item) => [item.experience.id, item])),
          );
        }
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
  }, [genre, isGenreRoute, retryVersion, rankingConfiguration, persona]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let debounce: number | undefined;

    Promise.resolve()
      .then(() => {
        if (!active) return;

        if (!query.trim()) {
          setVisibleResults([]);
          setSearchRankingById(new Map());
          setSearchLoading(false);

          return;
        }

        setVisibleResults([]);
        setSearchRankingById(new Map());
        setSearchLoading(true);
        setError(null);
        debounce = window.setTimeout(() => {
          searchCatalog(
            query,
            genre,
            searchSort,
            controller.signal,
            persona || undefined,
            rankingConfiguration,
          )
            .then((results) => {
              if (active) {
                setVisibleResults(results.map((item) => item.experience));
                setSearchRankingById(new Map(results.map((item) => [item.experience.id, item])));
              }
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
  }, [genre, query, searchSort, retryVersion, persona, rankingConfiguration]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    if (bookmarks.length === 0) {
      Promise.resolve()
        .then(() => {
          if (active) {
            setSavedExperiences([]);
            setSavedExperiencesLoading(false);
          }
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

    Promise.resolve()
      .then(() => {
        if (!active) return undefined;

        setSavedExperiencesLoading(true);

        return Promise.all(
          bookmarks.map((id) => fetchExperience(id, controller.signal).catch(() => null)),
        );
      })
      .then((items) => {
        if (active && items) {
          setSavedExperiences(items.filter((item): item is Experience => item !== null));
        }
      })
      .finally(() => {
        if (active) setSavedExperiencesLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;

        setError(cause instanceof Error ? cause.message : 'Unable to load saved experiences.');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [bookmarks, retryVersion]);

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
      next === 'All' ? '/all' : `/genre/${next.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    navigateTo(destination);
  }, []);

  const navigate = useCallback(
    (view: DiscoveryView) => {
      const destination =
        genre !== 'All' && view === 'explore'
          ? `/genre/${genre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
          : VIEW_TO_PATH[view];

      navigateTo(destination);
    },
    [genre],
  );

  const setPersona = useCallback(
    (next: string) => {
      updatePreferences((current) => ({ ...current, personaId: next || null }));
      setDiscoveryRefreshVersion((current) => current + 1);
    },
    [updatePreferences],
  );

  const retry = useCallback(() => {
    setError(null);
    setRetryVersion((current) => current + 1);
  }, []);

  const closeControls = useCallback(() => setControlsOpen(false), [setControlsOpen]);

  return {
    activeView,
    isExploreRoute,
    controlsOpen,
    setControlsOpen,
    rankingConfiguration,
    setRankingConfiguration,
    genre,
    setGenre,
    selectGenre,
    personas,
    genreCounts,
    genreExperiences: isGenreRoute && genre !== 'All' ? genreExperiences : EMPTY_EXPERIENCES,
    genreRankingById: isGenreRoute && genre !== 'All' ? genreRankingById : EMPTY_GENRE_RANKING,
    searchRankingById,
    isGenreRoute,
    isAllCatalogueRoute,
    allExperiences: isAllCatalogueRoute ? allExperiences : EMPTY_EXPERIENCES,
    allRankingById: isAllCatalogueRoute ? allRankingById : EMPTY_GENRE_RANKING,
    allHasMore,
    allTotal: genreCounts.All ?? 0,
    loadingMore,
    loadMoreCatalogue,
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
    savedExperiencesLoading,
    hasCustomRanking,
    navigate,
    closeControls,
    retry,
    setQuery: updateQuery,
    loading,
    error,
  };
}
