import { lazy, Suspense, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
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
    <SidebarProvider className="min-h-svh w-full [--sidebar-width:11rem]">
      <Sidebar
        activeView={page.activeView}
        selectedGenre={page.genre}
        onSelectGenre={(selected) => {
          page.selectGenre(selected);
        }}
      />
      <div className="min-w-0 flex-1">
        <Header
          query={page.query}
          onQueryChange={page.setQuery}
          resultCount={page.visibleResults.length}
          onOpenDiscoveryControls={() => page.setControlsOpen(true)}
          hasCustomRanking={page.hasCustomRanking}
        />
        <main className="mx-auto w-full max-w-screen-2xl space-y-8 px-4 py-6 md:px-6 lg:px-8" id="main-content">
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
    </SidebarProvider>
  );
}
