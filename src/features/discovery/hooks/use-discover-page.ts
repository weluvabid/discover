import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBrowserLocation, navigateTo } from '@/hooks/use-browser-location';
import { experiences } from '@/data/mocks/experiences';
import {
  DEFAULT_RANKING_CONFIGURATION,
  isDefaultRankingConfiguration,
  rankForContext,
  type RankingConfiguration,
  type RankingContext,
} from '@/features/discovery/engine/ranking';
import {
  filterExperiencesByGenre,
  searchExperiences,
} from '@/features/search/utils/search-experiences';
import { useBookmarks } from '@/hooks/use-bookmarks';
import {
  EXPERIENCE_GENRES,
  type DiscoveryView,
  type Experience,
  type ExperienceGenre,
} from '@/types/experience';

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
  const [rankingNow, setRankingNow] = useState(() => new Date());
  const requestedGenre = searchParams.get('genre');
  const genre: ExperienceGenre | 'All' =
    requestedGenre && EXPERIENCE_GENRES.includes(requestedGenre as ExperienceGenre)
      ? (requestedGenre as ExperienceGenre)
      : 'All';
  const query = searchParams.get('q') ?? '';

  useEffect(() => {
    if (pathname === '/search' && !query.trim()) {
      navigateTo('/', { replace: true });
    }
  }, [pathname, query]);

  const { bookmarks, toggleBookmark } = useBookmarks();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  useEffect(() => {
    const refreshClock = () => {
      if (document.visibilityState === 'visible') setRankingNow(new Date());
    };

    window.addEventListener('focus', refreshClock);
    document.addEventListener('visibilitychange', refreshClock);

    return () => {
      window.removeEventListener('focus', refreshClock);
      document.removeEventListener('visibilitychange', refreshClock);
    };
  }, []);

  const updateQuery = useCallback(
    (next: string) => {
      const params = new URLSearchParams();

      if (next.trim()) params.set('q', next);

      if (genre !== 'All') params.set('genre', genre);

      if (next.trim()) {
        navigateTo(`/search?${params.toString()}`, { replace: true });
      } else if (pathname === '/search') {
        const suffix = params.toString();

        navigateTo(`/${suffix ? `?${suffix}` : ''}`);
      }
    },
    [genre, pathname],
  );

  const setGenre = useCallback(
    (next: ExperienceGenre | 'All') => {
      const params = new URLSearchParams(searchParams);
      const targetPath = pathname === '/search' ? '/' : pathname;

      if (pathname === '/search') params.delete('q');

      if (next === 'All') params.delete('genre');
      else params.set('genre', next);

      const suffix = params.toString();

      navigateTo(`${targetPath}${suffix ? `?${suffix}` : ''}`, { replace: true });
    },
    [pathname, searchParams],
  );

  const searchResults = useMemo(() => searchExperiences(query, experiences), [query]);
  const visibleResults = useMemo(
    () => filterExperiencesByGenre(searchResults, genre),
    [genre, searchResults],
  );

  const rankedSections = useMemo(() => {
    const contexts: RankingContext[] = [
      'featured',
      'trending',
      'recommended',
      'hidden-gems',
      'recently-launched',
    ];
    const ranked = Object.fromEntries(
      contexts.map((context) => [
        context,
        rankForContext(experiences, rankingConfiguration, context, {
          now: rankingNow,
          genre,
          limit: context === 'featured' ? 1 : context === 'recommended' ? 7 : 8,
        }),
      ]),
    ) as Record<RankingContext, ReturnType<typeof rankForContext>>;

    const featuredId = ranked.featured[0]?.experience.id;

    ranked.recommended = ranked.recommended
      .filter((item) => item.experience.id !== featuredId)
      .slice(0, 6)
      .map((item, index) => ({ ...item, position: index + 1 }));

    return ranked;
  }, [genre, rankingConfiguration, rankingNow]);

  const rankedRecommendations = useMemo(
    () => rankedSections.recommended.map((item) => item.experience),
    [rankedSections],
  );
  const savedExperiences = useMemo(
    () => experiences.filter((experience) => bookmarks.includes(experience.id)),
    [bookmarks],
  );
  const hasCustomRanking = !isDefaultRankingConfiguration(rankingConfiguration);

  const selectGenre = useCallback((next: ExperienceGenre | 'All') => {
    const params = new URLSearchParams();
    if (next !== 'All') params.set('genre', next);
    const suffix = params.toString();
    navigateTo(`/${suffix ? `?${suffix}` : ''}`);
  }, []);

  const navigate = useCallback(
    (view: DiscoveryView) => {
      const params = new URLSearchParams();

      if (genre !== 'All') params.set('genre', genre);

      const serializedParams = params.toString();
      const suffix = serializedParams ? `?${serializedParams}` : '';

      navigateTo(`${VIEW_TO_PATH[view]}${suffix}`);
    },
    [genre],
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
    bookmarks,
    toggleBookmark,
    query,
    visibleResults,
    rankedRecommendations,
    rankedSections,
    savedExperiences,
    hasCustomRanking,
    navigate,
    closeControls,
    setQuery: updateQuery,
  };
}
