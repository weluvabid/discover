import { lazy, Suspense, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GenreFilters } from '@/components/discovery/GenreFilters';
import { Header } from '@/components/layout/Header';
import { MobileNavigation, Sidebar } from '@/components/layout/Navigation';
import { DiscoverView } from '@/components/pages/DiscoverView';
import { SearchResultsView } from '@/components/pages/SearchResultsView';
import { useDiscoverPage } from '@/features/discovery/hooks/use-discover-page';

const ExperienceDialog = lazy(() =>
  import('@/components/experience/ExperienceDialog').then((module) => ({
    default: module.ExperienceDialog,
  })),
);
const DiscoveryControlsDialog = lazy(() =>
  import('@/features/discovery/DiscoveryControlsDialog').then((module) => ({
    default: module.DiscoveryControlsDialog,
  })),
);

interface AppProps {
  initialLocation?: string;
}

export default function App({ initialLocation = '/' }: AppProps) {
  const page = useDiscoverPage(initialLocation);
  const controlsWereOpen = useRef(false);
  useEffect(() => {
    if (controlsWereOpen.current && !page.controlsOpen) {
      document.getElementById('tune-discovery-trigger')?.focus();
    }
    controlsWereOpen.current = page.controlsOpen;
  }, [page.controlsOpen]);
  const hasSearch = Boolean(page.query.trim());

  return (
    <div className="app-shell">
      <Sidebar
        activeView={page.activeView}
        selectedGenre={page.genre}
        onSelectGenre={(selected) => {
          page.navigate('explore');
          page.setQuery('');
          page.setGenre(selected);
        }}
      />
      <div className="main-column">
        <Header
          query={page.query}
          onQueryChange={page.setQuery}
          resultCount={page.visibleResults.length}
          onOpenFilters={() => page.setFilterOpen(true)}
          onOpenLibrary={() => page.navigate('library')}
          onOpenDiscoveryControls={() => page.setControlsOpen(true)}
          hasCustomRanking={page.hasCustomRanking}
        />
        <main className="page-content" id="main-content">
          {hasSearch ? (
            <SearchResultsView
              query={page.query || page.genre}
              results={page.visibleResults}
              bookmarks={page.bookmarks}
              onToggleBookmark={page.toggleBookmark}
              onSelect={page.selectExperience}
            />
          ) : (
            <DiscoverView
              activeView={page.activeView}
              bookmarks={page.bookmarks}
              savedExperiences={page.savedExperiences}
              recommendations={page.rankedRecommendations}
              rankedSections={page.rankedSections}
              genre={page.genre}
              onGenreChange={page.setGenre}
              onToggleBookmark={page.toggleBookmark}
              onSelect={page.selectExperience}
              onNavigate={page.navigate}
            />
          )}
        </main>
      </div>
      <MobileNavigation activeView={page.activeView} selectedGenre={page.genre} />

      {page.filterOpen && (
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
                onClick={() => page.setFilterOpen(false)}
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
            <p>Choose a genre to refine discovery.</p>
            <GenreFilters selected={page.genre} onSelect={page.setGenre} />
            <Button
              className="primary-button filter-apply"
              onClick={() => page.setFilterOpen(false)}
            >
              Show {page.visibleResults.length} experiences
            </Button>
          </section>
        </div>
      )}

      <Suspense fallback={null}>
        {page.selectedExperience && (
          <ExperienceDialog
            experience={page.selectedExperience}
            onClose={() => page.setSelectedExperience(null)}
          />
        )}
        {page.controlsOpen && (
          <DiscoveryControlsDialog
            open
            configuration={page.rankingConfiguration}
            onClose={page.closeControls}
            onApply={page.setRankingConfiguration}
          />
        )}
      </Suspense>
    </div>
  );
}
