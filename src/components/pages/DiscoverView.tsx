import { Bookmark, ChevronRight, Compass, Gem, Sparkles, TrendingUp } from 'lucide-react';
import type { RankedExperience, RankingContext } from '@/features/discovery/engine/ranking';

import { ExperienceSection } from '@/components/discovery/ExperienceSection';
import { Button } from '@/components/ui/button';
import { ExploreFilterBar } from '@/components/discovery/ExploreFilterBar';
import { FeaturedExperience } from '@/components/experience/FeaturedExperience';
import { CollectionsView } from './CollectionsView';
import { PageIntro } from './PageIntro';
import type { DiscoveryView, Experience, ExperienceGenre } from '@/types/experience';

interface DiscoverViewProps {
  activeView: DiscoveryView;
  bookmarks: string[];
  savedExperiences: Experience[];
  recommendations: Experience[];
  rankedSections: Record<RankingContext, RankedExperience[]>;
  genre: ExperienceGenre | 'All';
  onGenreChange: (genre: ExperienceGenre | 'All') => void;
  onToggleBookmark: (id: string) => void;
  onPlay: (experience: Experience) => void;
  onNavigate: (view: DiscoveryView) => void;
}

export function DiscoverView({
  activeView,
  bookmarks,
  savedExperiences,
  recommendations,
  rankedSections,
  genre,
  onGenreChange,
  onToggleBookmark,
  onPlay,
  onNavigate,
}: DiscoverViewProps) {
  const rankingMaps = Object.fromEntries(
    Object.entries(rankedSections).map(([context, items]) => [
      context,
      new Map(items.map((item) => [item.experience.id, item])),
    ]),
  ) as Record<RankingContext, Map<string, RankedExperience>>;
  const featured = rankedSections.featured[0];

  if (activeView === 'library') {
    return (
      <div className="min-w-0">
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
          onPlay={onPlay}
          emptyTitle="Your library is empty"
          emptyMessage="Save experiences as you explore and they'll appear here."
          emptyIcon={<Bookmark aria-hidden="true" />}
          emptyAction={
            <Button variant="outline" size="sm" onClick={() => onNavigate('explore')}>
              Browse experiences
            </Button>
          }
        />
      </div>
    );
  }

  if (activeView === 'collections') {
    return (
      <CollectionsView
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onPlay={onPlay}
      />
    );
  }

  if (activeView === 'trending') {
    return (
      <div className="min-w-0">
        <PageIntro
          eyebrow="WHAT PLAYERS LOVE"
          title="Trending now"
          description="Experiences gaining momentum across the community."
          icon={<TrendingUp size={17} />}
        />
        <ExperienceSection
          title="Rising this week"
          experiences={rankedSections.trending.map((item) => item.experience)}
          rankingById={rankingMaps.trending}
          variant="trending"
          bookmarks={bookmarks}
          onToggleBookmark={onToggleBookmark}
          onPlay={onPlay}
        />
      </div>
    );
  }

  if (activeView === 'hidden-gems') {
    return (
      <div className="min-w-0">
        <PageIntro
          eyebrow="OFF THE BEATEN PATH"
          title="Hidden gems"
          description="Smaller communities. Remarkable experiences. Worlds worth finding."
          icon={<Gem size={17} />}
        />
        <ExperienceSection
          title="Hidden Gems"
          subtitle="Lesser-known worlds with exceptional ratings and dedicated communities."
          experiences={rankedSections['hidden-gems'].map((item) => item.experience)}
          rankingById={rankingMaps['hidden-gems']}
          variant="recommended"
          bookmarks={bookmarks}
          onToggleBookmark={onToggleBookmark}
          onPlay={onPlay}
        />
      </div>
    );
  }

  return (
    <>
      <PageIntro
        eyebrow="PERSONALIZED DISCOVERY"
        title="Explore"
        description="Find worlds worth your time, ranked around what matters to you."
        icon={<Compass size={17} />}
      />
      <ExploreFilterBar genre={genre} onGenreChange={onGenreChange} />
      {featured && (
        <FeaturedExperience
          experience={featured.experience}
          ranking={featured}
          isBookmarked={bookmarks.includes(featured.experience.id)}
          onToggleBookmark={onToggleBookmark}
          onPlay={onPlay}
        />
      )}
      <ExperienceSection
        title="Trending for You"
        experiences={rankedSections.trending.map((item) => item.experience)}
        rankingById={rankingMaps.trending}
        variant="trending"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onPlay={onPlay}
        action={
          <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-foreground" onClick={() => onNavigate('trending')}>
            View all ({rankedSections.trending.length}) <ChevronRight size={15} />
          </Button>
        }
      />
      <ExperienceSection
        title="Recommended For You"
        subtitle="Ranked by your active discovery preferences and experience signals."
        experiences={recommendations}
        rankingById={rankingMaps.recommended}
        variant="recommended"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onPlay={onPlay}
      />
      <ExperienceSection
        title="Hidden Gems"
        subtitle="Lesser-known worlds with exceptional ratings and dedicated communities."
        experiences={rankedSections['hidden-gems'].map((item) => item.experience)}
        rankingById={rankingMaps['hidden-gems']}
        variant="recommended"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onPlay={onPlay}
      />
      <ExperienceSection
        title="Recently Launched"
        subtitle="New releases ranked by relevance to your discovery preferences."
        experiences={rankedSections['recently-launched'].map((item) => item.experience)}
        rankingById={rankingMaps['recently-launched']}
        variant="recent"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onPlay={onPlay}
      />
      <div className="mt-10 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        <Sparkles size={14} /> Recommendations are generated from sample player preferences and
        experience signals.
      </div>
    </>
  );
}
