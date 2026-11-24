import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DiscoverView } from '@/components/pages/DiscoverView';
import { SearchResultsView } from '@/components/pages/SearchResultsView';
import { useDiscoverPage } from '@/features/discovery/hooks/use-discover-page';
import type { Experience } from '@/types/experience';
import { resolveRobloxLaunchUrl } from '@/lib/roblox-launch';

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
  const { bookmarks, toggleBookmark: toggleBookmarkAction } = page;

  const toggleBookmark = useCallback(
    (id: string) => {
      const wasBookmarked = bookmarks.includes(id);

      toggleBookmarkAction(id);
      toast.success(wasBookmarked ? 'Removed from Library' : 'Added to Library');
    },
    [bookmarks, toggleBookmarkAction],
  );

  const launchExperience = useCallback((experience: Experience) => {
    if (!experience.robloxUrl) {
      toast.error(`${experience.title} doesn't have a Roblox launch URL yet.`);

      return;
    }

    const launchUrl = resolveRobloxLaunchUrl(experience.robloxUrl);

    if (!launchUrl) {
      toast.error('This experience has an invalid Roblox launch URL.');

      return;
    }

    const launchWindow = window.open(launchUrl.toString(), '_blank');

    if (!launchWindow) {
      toast.error('Your browser blocked the Roblox launch. Allow pop-ups and try again.');

      return;
    }

    launchWindow.opener = null;
    toast.success(`Opening ${experience.title} on Roblox`);
  }, []);

  useEffect(() => {
    if (controlsWereOpen.current && !page.controlsOpen) {
      document.getElementById('tune-discovery-trigger')?.focus();
    }

    controlsWereOpen.current = page.controlsOpen;
  }, [page.controlsOpen]);
  const hasSearch = page.activeView === 'search';

  return (
    <SidebarProvider className="min-h-svh w-full [--sidebar-width:11rem]">
      <Sidebar
        activeView={page.activeView}
        selectedGenre={page.genre}
        genreCounts={page.genreCounts}
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
          personas={page.personas}
          persona={page.persona}
          onPersonaChange={page.setPersona}
        />
        <main
          className="mx-auto w-full max-w-screen-2xl space-y-8 px-4 py-6 md:px-6 lg:px-8"
          id="main-content"
        >
          {page.error && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              <span className="min-w-0 flex-1">{page.error}</span>
              <button
                type="button"
                onClick={page.retry}
                className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-destructive/30 px-3 font-medium transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw size={14} aria-hidden="true" />
                Retry
              </button>
            </div>
          )}
          {hasSearch ? (
            <SearchResultsView
              query={page.query || page.genre}
              results={page.visibleResults}
              sort={page.searchSort}
              onSortChange={page.setSearchSort}
              bookmarks={page.bookmarks}
              onToggleBookmark={toggleBookmark}
              onPlay={launchExperience}
              loading={page.searchLoading}
              genre={page.genre}
              onGenreChange={page.setGenre}
            />
          ) : (
            <DiscoverView
              activeView={page.activeView}
              bookmarks={page.bookmarks}
              savedExperiences={page.savedExperiences}
              collectionExperiences={page.collectionCatalog}
              recommendations={page.rankedRecommendations}
              rankedSections={page.rankedSections}
              genre={page.genre}
              personas={page.personas}
              persona={page.persona}
              genreExperiences={page.genreExperiences}
              isGenreRoute={page.isGenreRoute}
              onGenreChange={page.setGenre}
              onToggleBookmark={toggleBookmark}
              onPlay={launchExperience}
              onNavigate={page.navigate}
              loading={page.loading}
            />
          )}
        </main>
      </div>
      <Suspense fallback={null}>
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
