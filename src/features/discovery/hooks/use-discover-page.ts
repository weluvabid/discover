import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBrowserLocation, navigateTo } from '@/hooks/use-browser-location';
import {
  DEFAULT_RANKING_CONFIGURATION,
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
import {
  EXPERIENCE_GENRES,
  type DiscoveryPersona,
  type DiscoveryView,
  type Experience,
  type ExperienceGenre,
} from '@/types/experience';

const CONTEXTS: RankingContext[] = [
  'featured',
  'trending',
  'recommended',
  'hidden-gems',
  'recently-launched',
];
const EMPTY_RANKED_SECTIONS = Object.fromEntries(
  CONTEXTS.map((context) => [context, []]),
) as Record<RankingContext, RankedExperience[]>;

const PATH_TO_VIEW: Record<string, DiscoveryView> = {
  '/': 'explore',
  '/trending': 'trending',
  '/hidden-gems': 'hidden-gems',
  '/collections': 'collections',
  '/library': 'library',
};
const VIEW_TO_PATH: Record<DiscoveryView, string> = {
  explore: '/',
  trending: '/trending',
  'hidden-gems': '/hidden-gems',
  collections: '/collections',
  library: '/library',
};

export function useDiscoverPage(initialLocation = '/') {
  const browserLocation = useBrowserLocation(initialLocation);
  const [pathname, search = ''] = browserLocation.split('?');
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const activeView = PATH_TO_VIEW[pathname] ?? 'explore';
  const [controlsOpen, setControlsOpen] = useState(false);
  const [rankingConfiguration, setRankingConfiguration] = useState<RankingConfiguration>(
    DEFAULT_RANKING_CONFIGURATION,
  );
  const requestedGenre = searchParams.get('genre');
  const genre: ExperienceGenre | 'All' =
    requestedGenre && EXPERIENCE_GENRES.includes(requestedGenre as ExperienceGenre)
      ? (requestedGenre as ExperienceGenre)
      : 'All';
  const query = searchParams.get('q') ?? '';
  const requestedSort = searchParams.get('sort') as SearchSort | null;
  const searchSort: SearchSort =
    requestedSort &&
    ['relevance', 'players', 'rating', 'reviews', 'launched', 'updated'].includes(requestedSort)
      ? requestedSort
      : 'relevance';
  const requestedPersona = searchParams.get('persona') ?? '';
  const [personas, setPersonas] = useState<DiscoveryPersona[]>([]);
  const [genreCounts, setGenreCounts] = useState<Record<string, number>>({});
  const persona =
    personas.length === 0 || personas.some((item) => item.id === requestedPersona)
      ? requestedPersona
      : '';
  const { bookmarks, toggleBookmark } = useBookmarks();
  const [rankedSections, setRankedSections] = useState(EMPTY_RANKED_SECTIONS);
  const [visibleResults, setVisibleResults] = useState<Experience[]>([]);
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
    if (pathname === '/search' && !query.trim()) navigateTo('/', { replace: true });
  }, [pathname, query]);

  useEffect(() => {
    if (searchParams.get('tune') !== '1') return;

    setControlsOpen(true);
    const nextUrl = new URL(window.location.href);

    nextUrl.searchParams.delete('tune');
    window.history.replaceState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }, [searchParams]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);

    Promise.all(
      CONTEXTS.map((context) =>
        fetchDiscovery(
          context,
          rankingConfiguration,
          genre,
          controller.signal,
          undefined,
          persona || undefined,
        ),
      ),
    )
      .then((responses) => {
        if (!active) return;

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
  }, [genre, persona, rankingConfiguration]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    if (!query.trim()) {
      setVisibleResults([]);
      setSearchLoading(false);

      return () => controller.abort();
    }

    setVisibleResults([]);
    setSearchLoading(true);
    setError(null);
    const debounce = window.setTimeout(() => {
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

    return () => {
      active = false;
      window.clearTimeout(debounce);
      controller.abort();
    };
  }, [genre, query, searchSort]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    if (bookmarks.length === 0) {
      setSavedExperiences([]);

      return () => controller.abort();
    }

    Promise.all(
      bookmarks.map((id) => fetchExperience(id, controller.signal).catch(() => null)),
    ).then((items) => {
      if (active) setSavedExperiences(items.filter((item): item is Experience => item !== null));
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

      if (persona) params.set('persona', persona);

      if (searchSort !== 'relevance') params.set('sort', searchSort);

      if (next.trim()) navigateTo(`/search?${params.toString()}`, { replace: true });
      else if (pathname === '/search') navigateTo(`/${params.size ? `?${params}` : ''}`);
    },
    [genre, pathname, persona, searchSort],
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
      const targetPath = pathname === '/search' ? '/' : pathname;

      if (pathname === '/search') params.delete('q');

      if (next === 'All') params.delete('genre');
      else params.set('genre', next);

      navigateTo(`${targetPath}${params.size ? `?${params}` : ''}`, { replace: true });
    },
    [pathname, searchParams],
  );

  const selectGenre = useCallback(
    (next: ExperienceGenre | 'All') => {
      const params = new URLSearchParams();

      if (next !== 'All') params.set('genre', next);

      if (persona) params.set('persona', persona);

      navigateTo(`/${params.size ? `?${params}` : ''}`);
    },
    [persona],
  );

  const navigate = useCallback(
    (view: DiscoveryView) => {
      const params = new URLSearchParams();

      if (genre !== 'All') params.set('genre', genre);

      if (persona) params.set('persona', persona);

      navigateTo(`${VIEW_TO_PATH[view]}${params.size ? `?${params}` : ''}`);
    },
    [genre, persona],
  );

  const setPersona = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams);

      if (next) params.set('persona', next);
      else params.delete('persona');

      navigateTo(`${pathname}${params.size ? `?${params}` : ''}`, { replace: true });
    },
    [pathname, searchParams],
  );

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
