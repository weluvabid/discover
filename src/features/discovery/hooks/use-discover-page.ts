import { useCallback, useMemo, useState } from 'react';
import { experiences } from '@/data/mocks/experiences';
import { featuredExperience } from '@/data/mocks/catalog';
import {
  isDefaultRankingConfiguration,
  rankExperiences,
  DEFAULT_RANKING_CONFIGURATION,
  type RankingConfiguration,
} from '@/features/discovery/engine/ranking';
import { useDiscovery } from '@/features/search/hooks/use-discovery';
import { filterExperiencesByGenre } from '@/features/search/utils/search-experiences';
import { useBookmarks } from '@/hooks/use-bookmarks';
import type { DiscoveryView, Experience, ExperienceGenre } from '@/types/experience';

export function useDiscoverPage() {
  const [activeView, setActiveView] = useState<DiscoveryView>('explore');
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [rankingConfiguration, setRankingConfiguration] = useState<RankingConfiguration>(
    DEFAULT_RANKING_CONFIGURATION,
  );
  const [genre, setGenre] = useState<ExperienceGenre | 'All'>('All');
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { query, setQuery, results } = useDiscovery();

  const visibleResults = useMemo(() => filterExperiencesByGenre(results, genre), [genre, results]);
  const rankedRecommendations = useMemo(
    () =>
      rankExperiences(
        experiences.filter((experience) => experience.id !== featuredExperience.id),
        rankingConfiguration,
      )
        .slice(0, 6)
        .map((item) => item.experience),
    [rankingConfiguration],
  );
  const savedExperiences = useMemo(
    () => experiences.filter((experience) => bookmarks.includes(experience.id)),
    [bookmarks],
  );
  const hasCustomRanking = !isDefaultRankingConfiguration(rankingConfiguration);

  const navigate = useCallback(
    (view: DiscoveryView) => {
      setActiveView(view);
      setQuery('');
      setGenre('All');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setQuery],
  );
  const closeControls = useCallback(() => setControlsOpen(false), []);
  const selectExperience = useCallback(
    (experience: Experience) => setSelectedExperience(experience),
    [],
  );

  return {
    activeView,
    setActiveView,
    selectedExperience,
    setSelectedExperience,
    filterOpen,
    setFilterOpen,
    controlsOpen,
    setControlsOpen,
    rankingConfiguration,
    setRankingConfiguration,
    genre,
    setGenre,
    bookmarks,
    toggleBookmark,
    query,
    setQuery,
    visibleResults,
    rankedRecommendations,
    savedExperiences,
    hasCustomRanking,
    navigate,
    closeControls,
    selectExperience,
  };
}
