import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, BadgeCheck, Bookmark, Star, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ExperienceCard } from '@/components/experience/ExperienceCard';
import { ExperienceArtwork } from '@/components/experience/ExperienceArtwork';
import { ExperiencePlayButton } from '@/components/experience/ExperiencePlayButton';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { fetchCatalog, fetchExperience, fetchGenreCounts } from '@/lib/api/discover-api';
import { resolveRobloxLaunchUrl } from '@/lib/roblox-launch';
import { formatCount } from '@/lib/utils';
import type { Experience, ExperienceGenre } from '@/types/experience';

interface GameDetailIslandProps {
  initialId: string;
}

interface DetailShellProps {
  children: ReactNode;
  genreCounts: Record<string, number>;
  query: string;
  onQueryChange: (value: string) => void;
}

function DetailShell({ children, genreCounts, query, onQueryChange }: DetailShellProps) {
  return (
    <SidebarProvider className="min-h-svh w-full [--sidebar-width:11rem]">
      <Sidebar
        activeView="explore"
        selectedGenre="All"
        genreCounts={genreCounts}
        nativeNavigation
        onSelectGenre={(genre: ExperienceGenre | 'All') => {
          const destination = genre === 'All' ? '/' : `/?genre=${encodeURIComponent(genre)}`;

          window.location.assign(destination);
        }}
      />
      <div className="min-w-0 flex-1">
        <Header
          query={query}
          onQueryChange={onQueryChange}
          resultCount={-1}
          onOpenDiscoveryControls={() => window.location.assign('/?tune=1')}
          hasCustomRanking={false}
        />
        <main
          id="main-content"
          className="mx-auto w-full max-w-screen-2xl space-y-8 px-4 py-6 md:px-6 lg:px-8"
        >
          <div className="mx-auto w-full max-w-6xl space-y-8">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}

export function GameDetailIsland({ initialId }: GameDetailIslandProps) {
  const [experience, setExperience] = useState<Experience | null>(null);
  const [related, setRelated] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genreCounts, setGenreCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const { bookmarks, toggleBookmark } = useBookmarks();

  useEffect(() => {
    const controller = new AbortController();

    fetchGenreCounts(controller.signal)
      .then((result) => setGenreCounts(result.data))
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) return;

    const timeout = window.setTimeout(() => {
      window.location.assign(`/search?q=${encodeURIComponent(trimmed)}`);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const requestedId = initialId || new URLSearchParams(window.location.search).get('id') || '';
    const controller = new AbortController();

    Promise.resolve()
      .then(() => {
        if (!/^\d{1,20}$/.test(requestedId)) {
          setError('This experience could not be found.');
          setLoading(false);

          return null;
        }

        setLoading(true);
        setError(null);

        return fetchExperience(requestedId, controller.signal);
      })
      .then((item) => {
        if (!item || controller.signal.aborted) return;

        setExperience(item);

        return fetchCatalog(500, controller.signal)
          .then((catalog) => {
            setRelated(
              catalog.data
                .filter((candidate) => candidate.id !== item.id && candidate.genre === item.genre)
                .slice(0, 4),
            );
          })
          .catch(() => setRelated([]));
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;

        setError(cause instanceof Error ? cause.message : 'Unable to load this experience.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [initialId]);

  useEffect(() => {
    if (experience) document.title = `${experience.title} — Discover`;
  }, [experience]);

  const bookmarked = experience ? bookmarks.includes(experience.id) : false;
  const description = useMemo(() => experience?.description.trim() ?? '', [experience]);

  const launch = () => {
    if (!experience?.robloxUrl) return;

    const url = resolveRobloxLaunchUrl(experience.robloxUrl);

    if (!url) {
      toast.error('This experience has an invalid Roblox launch URL.');

      return;
    }

    const opened = window.open(url.toString(), '_blank');

    if (!opened) {
      toast.error('Your browser blocked the Roblox launch. Allow pop-ups and try again.');

      return;
    }

    opened.opener = null;
  };

  const openRelatedExperience = (item: Experience) => {
    if (!item.robloxUrl) return;

    const url = resolveRobloxLaunchUrl(item.robloxUrl);

    if (url) window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  const shell = (children: ReactNode) => (
    <DetailShell genreCounts={genreCounts} query={query} onQueryChange={setQuery}>
      {children}
    </DetailShell>
  );

  if (loading) {
    return shell(
      <div role="status" className="py-16 text-sm text-muted-foreground">
        Loading experience…
      </div>,
    );
  }

  if (error || !experience) {
    return shell(
      <section className="py-8">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to Discover
        </a>
        <h1 className="mt-8 text-2xl font-bold">Experience not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? 'This experience is no longer available.'}
        </p>
      </section>,
    );
  }

  return shell(
    <>
      <a
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to Discover
      </a>
      <article className="overflow-hidden rounded-2xl border border-border bg-card">
        <ExperienceArtwork
          src={experience.artwork.hero ?? experience.artwork.thumbnail}
          alt={experience.artwork.alt}
          className="aspect-video w-full"
          loading="eager"
          fetchPriority="high"
        />
        <div className="grid gap-8 p-5 md:grid-cols-[minmax(0,1fr)_17rem] md:p-8">
          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap gap-2">
              {[experience.genre, experience.subgenre, ...experience.tags.slice(0, 2)]
                .filter((tag, index, tags) => tags.indexOf(tag) === index)
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{experience.title}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                By {experience.creator}
                {experience.creatorVerified && <BadgeCheck size={15} />}
              </p>
            </div>
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">About this experience</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {description || 'No description is available for this experience.'}
              </p>
            </section>
          </div>
          <aside className="space-y-4 md:border-l md:border-border md:pl-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-secondary/60 p-3">
                <Users size={16} className="text-muted-foreground" />
                <p className="mt-2 text-lg font-bold tabular-nums">
                  {formatCount(experience.metrics.activePlayers)}
                </p>
                <p className="text-xs text-muted-foreground">Playing now</p>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <p className="mt-2 text-lg font-bold tabular-nums">{experience.metrics.rating}%</p>
                <p className="text-xs text-muted-foreground">Positive</p>
              </div>
              <div className="col-span-2 rounded-xl bg-secondary/60 p-3">
                <p className="text-lg font-bold tabular-nums">
                  {formatCount(experience.metrics.reviewCount)}
                </p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            </div>
            <ExperiencePlayButton onClick={launch} className="w-full" />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => toggleBookmark(experience.id)}
              aria-pressed={bookmarked}
            >
              <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
              {bookmarked ? 'Saved to Library' : 'Save to Library'}
            </Button>
          </aside>
        </div>
      </article>
      {related.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">More in {experience.genre}</h2>
            <p className="text-sm text-muted-foreground">Other experiences you might enjoy.</p>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((item) => (
              <ExperienceCard
                key={item.id}
                experience={item}
                isBookmarked={bookmarks.includes(item.id)}
                onToggleBookmark={toggleBookmark}
                onPlay={() => openRelatedExperience(item)}
              />
            ))}
          </div>
        </section>
      )}
    </>,
  );
}
