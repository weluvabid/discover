import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { toast, Toaster } from 'sonner';
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
        <main
          className="mx-auto w-full max-w-screen-2xl space-y-8 px-4 py-6 md:px-6 lg:px-8"
          id="main-content"
        >
          {page.error && (
            <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {page.error}
            </div>
          )}
          {page.loading && !hasSearch && page.rankedSections.featured.length === 0 && (
            <div role="status" className="text-sm text-muted-foreground">Loading discovery results…</div>
          )}
          {hasSearch ? (
            <SearchResultsView
              query={page.query || page.genre}
              results={page.visibleResults}
              bookmarks={page.bookmarks}
              onToggleBookmark={toggleBookmark}
              onPlay={launchExperience}
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
              onPersonaChange={page.setPersona}
              onGenreChange={page.setGenre}
              onToggleBookmark={toggleBookmark}
              onPlay={launchExperience}
              onNavigate={page.navigate}
            />
          )}
        </main>
      </div>
      <Toaster position="bottom-center" theme="dark" />
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
