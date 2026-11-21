import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Bookmark,
  ChevronRight,
  Compass,
  Gem,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExperienceCard } from '@/components/experience/ExperienceCard';
import { ExperienceDialog } from '@/components/experience/ExperienceDialog';
import { FeaturedExperience } from '@/components/experience/FeaturedExperience';
import { ExperienceSection } from '@/components/discovery/ExperienceSection';
import { GenreFilters } from '@/components/discovery/GenreFilters';
import { HiddenGems } from '@/components/discovery/HiddenGems';
import { Header } from '@/components/layout/Header';
import { MobileNavigation, Sidebar } from '@/components/layout/Navigation';
import {
  experiences,
  featuredExperience,
  getMockExperience,
  hiddenGemExperiences,
  recentlyLaunchedExperiences,
  trendingExperiences,
} from '@/data/mocks/experiences';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useDiscovery } from '@/hooks/use-discovery';
import { DiscoveryControlsDialog } from '@/features/discovery/DiscoveryControlsDialog';
import {
  DEFAULT_RANKING_CONFIGURATION,
  rankExperiences,
  type RankingConfiguration,
} from '@/features/discovery/ranking';
import type { DiscoveryView, Experience, ExperienceGenre } from '@/types/experience';

export default function App() {
  const [activeView, setActiveView] = useState<DiscoveryView>('explore');
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [rankingConfiguration, setRankingConfiguration] = useState<RankingConfiguration>(
    DEFAULT_RANKING_CONFIGURATION,
  );
  const closeControls = useCallback(() => setControlsOpen(false), []);
  const [genre, setGenre] = useState<ExperienceGenre | 'All'>('All');
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { query, setQuery, results } = useDiscovery();

  const visibleResults = useMemo(() => {
    return results.filter(
      (experience) =>
        genre === 'All' ||
        experience.genre === genre ||
        experience.tags.includes(genre) ||
        experience.subgenre.toLocaleLowerCase().includes(genre.toLocaleLowerCase()),
    );
  }, [genre, results]);

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

  const navigate = (view: DiscoveryView) => {
    setActiveView(view);
    setQuery('');
    setGenre('All');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectExperience = (experience: Experience) => setSelectedExperience(experience);

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onNavigate={navigate}
        selectedGenre={genre}
        onSelectGenre={(selected) => {
          setActiveView('explore');
          setQuery('');
          setGenre(selected);
        }}
      />
      <div className="main-column">
        <Header
          query={query}
          onQueryChange={setQuery}
          resultCount={visibleResults.length}
          onOpenFilters={() => setFilterOpen(true)}
          onOpenLibrary={() => navigate('library')}
          onOpenDiscoveryControls={() => setControlsOpen(true)}
          hasCustomRanking={
            JSON.stringify(rankingConfiguration) !== JSON.stringify(DEFAULT_RANKING_CONFIGURATION)
          }
        />
        <main className="page-content" id="main-content">
          {activeView === 'explore' && (
            <div className="mobile-filters">
              <GenreFilters selected={genre} onSelect={setGenre} />
            </div>
          )}
          {query.trim() || genre !== 'All' ? (
            <SearchResults
              query={query || genre}
              results={visibleResults}
              bookmarks={bookmarks}
              onToggleBookmark={toggleBookmark}
              onSelect={handleSelectExperience}
            />
          ) : (
            <ViewContent
              activeView={activeView}
              bookmarks={bookmarks}
              savedExperiences={savedExperiences}
              onToggleBookmark={toggleBookmark}
              onSelect={handleSelectExperience}
              onNavigate={navigate}
              recommendations={rankedRecommendations}
            />
          )}
        </main>
      </div>
      <MobileNavigation activeView={activeView} onNavigate={navigate} />
      {filterOpen && (
        <div className="filter-backdrop" role="presentation">
          <section
            className="filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-title"
          >
            <div className="filter-sheet-heading">
              <h2 id="filter-title">Filter experiences</h2>
              <button
                className="icon-button"
                onClick={() => setFilterOpen(false)}
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
            <p>Choose a genre to refine discovery.</p>
            <GenreFilters selected={genre} onSelect={setGenre} />
            <Button className="primary-button filter-apply" onClick={() => setFilterOpen(false)}>
              Show {visibleResults.length} experiences
            </Button>
          </section>
        </div>
      )}
      <ExperienceDialog
        experience={selectedExperience}
        onClose={() => setSelectedExperience(null)}
      />
      {controlsOpen && (
        <DiscoveryControlsDialog
          open={true}
          configuration={rankingConfiguration}
          onClose={closeControls}
          onApply={setRankingConfiguration}
        />
      )}
    </div>
  );
}

interface ViewContentProps {
  activeView: DiscoveryView;
  bookmarks: string[];
  savedExperiences: Experience[];
  onToggleBookmark: (id: string) => void;
  onSelect: (experience: Experience) => void;
  onNavigate: (view: DiscoveryView) => void;
  recommendations: Experience[];
}

function ViewContent({
  activeView,
  bookmarks,
  savedExperiences,
  onToggleBookmark,
  onSelect,
  onNavigate,
  recommendations,
}: ViewContentProps) {
  if (activeView === 'library') {
    return (
      <div className="alternate-view">
        <PageIntro
          eyebrow="YOUR COLLECTION"
          title="Library"
          description="The worlds you've saved for later."
          icon={<Bookmark size={17} />}
        />
        <ExperienceSection
          title="Saved experiences"
          experiences={savedExperiences}
          variant="recommended"
          bookmarks={bookmarks}
          onToggleBookmark={onToggleBookmark}
          onSelect={onSelect}
          emptyMessage="Your library is empty. Save experiences as you explore and they'll appear here."
        />
      </div>
    );
  }

  if (activeView === 'collections') {
    return (
      <CollectionsView
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onSelect={onSelect}
      />
    );
  }

  if (activeView === 'trending') {
    return (
      <div className="alternate-view">
        <PageIntro
          eyebrow="WHAT PLAYERS LOVE"
          title="Trending now"
          description="Experiences gaining momentum across the community."
          icon={<TrendingUp size={17} />}
        />
        <ExperienceSection
          title="Rising this week"
          experiences={[...trendingExperiences].sort(
            (a, b) => (b.metrics.weeklyChange ?? 0) - (a.metrics.weeklyChange ?? 0),
          )}
          variant="trending"
          bookmarks={bookmarks}
          onToggleBookmark={onToggleBookmark}
          onSelect={onSelect}
        />
        <ExperienceSection
          title="Popular right now"
          experiences={[...experiences]
            .sort((a, b) => b.metrics.activePlayers - a.metrics.activePlayers)
            .slice(0, 8)}
          variant="recommended"
          bookmarks={bookmarks}
          onToggleBookmark={onToggleBookmark}
          onSelect={onSelect}
        />
      </div>
    );
  }

  if (activeView === 'hidden-gems') {
    return (
      <div className="alternate-view">
        <PageIntro
          eyebrow="OFF THE BEATEN PATH"
          title="Hidden gems"
          description="Smaller communities. Remarkable experiences. Worlds worth finding."
          icon={<Gem size={17} />}
        />
        <HiddenGems experiences={hiddenGemExperiences} onSelect={onSelect} />
      </div>
    );
  }

  return (
    <>
      <FeaturedExperience
        experience={featuredExperience}
        isBookmarked={bookmarks.includes(featuredExperience.id)}
        onToggleBookmark={onToggleBookmark}
        onSelect={onSelect}
      />
      <ExperienceSection
        title="Trending Now"
        experiences={trendingExperiences}
        variant="trending"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onSelect={onSelect}
        action={
          <button className="text-action" onClick={() => onNavigate('trending')}>
            View all ({experiences.length}) <ChevronRight size={15} />
          </button>
        }
      />
      <ExperienceSection
        title="Recommended For You"
        subtitle="Based on your love for Atmospheric & Co-op Exploration"
        experiences={recommendations}
        variant="recommended"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onSelect={onSelect}
      />
      <HiddenGems experiences={hiddenGemExperiences} onSelect={onSelect} />
      <ExperienceSection
        title="Recently Launched"
        experiences={recentlyLaunchedExperiences}
        variant="recent"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onSelect={onSelect}
        action={
          <button className="text-action" onClick={() => onNavigate('trending')}>
            New releases <ArrowRight size={15} />
          </button>
        }
      />
      <div className="discovery-footnote">
        <Sparkles size={14} /> Recommendations are generated from sample player preferences and
        experience signals.
      </div>
    </>
  );
}

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
}

function PageIntro({ eyebrow, title, description, icon }: PageIntroProps) {
  return (
    <div className="page-intro">
      <span className="page-eyebrow">
        {icon}
        {eyebrow}
      </span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

interface SearchResultsProps {
  query: string;
  results: Experience[];
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onSelect: (experience: Experience) => void;
}

function SearchResults({
  query,
  results,
  bookmarks,
  onToggleBookmark,
  onSelect,
}: SearchResultsProps) {
  return (
    <div className="alternate-view search-results-view">
      <PageIntro
        eyebrow="DISCOVERY SEARCH"
        title="Search results"
        description={`Showing matches for “${query}”.`}
        icon={<Compass size={17} />}
      />
      <ExperienceSection
        title={`${results.length} experiences found`}
        experiences={results}
        variant="recommended"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onSelect={onSelect}
        emptyMessage="No experiences match that search. Try another title, creator or genre."
      />
    </div>
  );
}

interface CollectionsViewProps {
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onSelect: (experience: Experience) => void;
}

function CollectionsView({ bookmarks, onToggleBookmark, onSelect }: CollectionsViewProps) {
  const collections = [
    {
      title: 'Into the Unknown',
      description: 'Atmospheric worlds made for curious explorers.',
      items: ['deep-descent', 'pinecrest-deep-wilds', 'liminal-protocols'].map(getMockExperience),
    },
    {
      title: 'Play Together',
      description: 'Bring your crew. These worlds are better together.',
      items: ['threshold-corridor', 'vanguard-cyber-drift', 'neon-ronin'].map(getMockExperience),
    },
    {
      title: 'Think Different',
      description: 'Unusual mechanics and clever worlds worth exploring.',
      items: ['clockwork-citadel', 'orbit-mechanics', 'singularity-genesis'].map(getMockExperience),
    },
  ];

  return (
    <div className="alternate-view">
      <PageIntro
        eyebrow="CURATED WORLDS"
        title="Collections"
        description="A few good places to start, picked by the Discover team."
        icon={<Sparkles size={17} />}
      />
      {collections.map((collection) => (
        <section className="collection-block" key={collection.title}>
          <div className="collection-heading">
            <div>
              <h2>{collection.title}</h2>
              <p>{collection.description}</p>
            </div>
            <span>{collection.items.length} experiences</span>
          </div>
          <div className="experience-grid grid-recommended">
            {collection.items.map((experience) => (
              <ExperienceCard
                key={experience.id}
                experience={experience}
                variant="recommended"
                isBookmarked={bookmarks.includes(experience.id)}
                onToggleBookmark={onToggleBookmark}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
