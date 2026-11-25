import { Bookmark, ChevronRight, Gem, Sparkles, TrendingUp } from 'lucide-react';
import type { RankedExperience, RankingContext } from '@/features/discovery/engine/ranking';

import { ExperienceSection } from '@/components/discovery/ExperienceSection';
import { Button } from '@/components/ui/button';
import { ExploreFilterBar } from '@/components/discovery/ExploreFilterBar';
import { FeaturedExperience } from '@/components/experience/FeaturedExperience';
import { FeaturedExperienceSkeleton } from '@/components/experience/FeaturedExperienceSkeleton';
import { PageIntro } from './PageIntro';
import type {
  DiscoveryPersona,
  DiscoveryView,
  Experience,
  ExperienceGenre,
} from '@/types/experience';

interface DiscoverViewProps {
  activeView: DiscoveryView;
  bookmarks: string[];
  savedExperiences: Experience[];
  savedExperiencesLoading: boolean;
  recommendations: Experience[];
  rankedSections: Record<RankingContext, RankedExperience[]>;
  genre: ExperienceGenre | 'All';
  personas: DiscoveryPersona[];
  persona: string;
  genreExperiences: Experience[];
  genreRankingById: Map<string, RankedExperience>;
  isGenreRoute: boolean;
  onGenreChange: (genre: ExperienceGenre | 'All') => void;
  onToggleBookmark: (id: string) => void;
  onPlay: (experience: Experience) => void;
  onNavigate: (view: DiscoveryView) => void;
  loading: boolean;
}

export function DiscoverView({
  activeView,
  bookmarks,
  savedExperiences,
  savedExperiencesLoading,
  recommendations,
  rankedSections,
  genre,
  personas,
  persona,
  genreExperiences,
  genreRankingById,
  isGenreRoute,
  onGenreChange,
  onToggleBookmark,
  onPlay,
  onNavigate,
  loading,
}: DiscoverViewProps) {
  const rankingMaps = Object.fromEntries(
    Object.entries(rankedSections).map(([context, items]) => [
      context,
      new Map(items.map((item) => [item.experience.id, item])),
    ]),
  ) as Record<RankingContext, Map<string, RankedExperience>>;
  const featured = rankedSections.featured[0];
  const selectedPersona = personas.find((item) => item.id === persona);

  if (isGenreRoute) {
    return (
      <div className="min-w-0">
        <PageIntro
          eyebrow="BROWSE GENRE"
          title={genre}
          description={`Explore ${genre} experiences from the expanded Roblox catalogue.`}
        />
        <ExperienceSection
          title={`${genre} experiences`}
          experiences={genreExperiences}
          rankingById={genreRankingById}
          rankingLabel="GENRE DISCOVERY SCORE"
          variant="recommended"
          bookmarks={bookmarks}
          onToggleBookmark={onToggleBookmark}
          onPlay={onPlay}
          loading={loading}
          emptyTitle={`No ${genre} experiences found`}
          emptyMessage="Try another genre or explore all experiences."
        />
      </div>
    );
  }

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
          loading={savedExperiencesLoading}
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
          rankingLabel="TRENDING SCORE"
          variant="trending"
          bookmarks={bookmarks}
          onToggleBookmark={onToggleBookmark}
          onPlay={onPlay}
          loading={loading}
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
          subtitle="Lesser-known worlds with smaller live audiences and positive ratings when available."
          experiences={rankedSections['hidden-gems'].map((item) => item.experience)}
          rankingById={rankingMaps['hidden-gems']}
          variant="recommended"
          bookmarks={bookmarks}
          onToggleBookmark={onToggleBookmark}
          onPlay={onPlay}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <>
      <PageIntro
        title="Explore"
        description={
          selectedPersona
            ? `Discover worlds matched to the ${selectedPersona.label.toLowerCase()} play style.`
            : 'Find worlds worth your time, ranked by engagement, relevance and discovery signals.'
        }
      />
      <ExploreFilterBar
        genre={genre}
        onGenreChange={onGenreChange}
      />
      {loading ? (
        <FeaturedExperienceSkeleton />
      ) : featured ? (
        <FeaturedExperience
          experience={featured.experience}
          ranking={featured}
          isBookmarked={bookmarks.includes(featured.experience.id)}
          onToggleBookmark={onToggleBookmark}
          onPlay={onPlay}
        />
      ) : null}
      <ExperienceSection
        title="Trending for You"
        experiences={rankedSections.trending.map((item) => item.experience)}
        rankingById={rankingMaps.trending}
        rankingLabel="TRENDING SCORE"
        variant="trending"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onPlay={onPlay}
        loading={loading}
        action={
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onNavigate('trending')}
          >
            View all ({rankedSections.trending.length}) <ChevronRight size={15} />
          </Button>
        }
      />
      <ExperienceSection
        title="Recommended For You"
        subtitle={
          selectedPersona
            ? `Ranked against the ${selectedPersona.label} profile and experience signals.`
            : 'Ranked by engagement quality, relevance and discovery signals.'
        }
        experiences={recommendations}
        rankingById={rankingMaps.recommended}
        rankingLabel="RECOMMENDED SCORE"
        variant="recommended"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onPlay={onPlay}
        loading={loading}
      />
      <ExperienceSection
        title="Hidden Gems"
        subtitle="Lesser-known worlds with smaller live audiences and positive ratings when available."
        experiences={rankedSections['hidden-gems'].map((item) => item.experience)}
        rankingById={rankingMaps['hidden-gems']}
        rankingLabel="HIDDEN GEMS SCORE"
        variant="recommended"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onPlay={onPlay}
        loading={loading}
      />
      <ExperienceSection
        title="Recently Launched"
        subtitle="New releases ranked by relevance to your discovery preferences."
        experiences={rankedSections['recently-launched'].map((item) => item.experience)}
        rankingById={rankingMaps['recently-launched']}
        rankingLabel="RECENTLY LAUNCHED SCORE"
        variant="recent"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onPlay={onPlay}
        loading={loading}
      />
      <div className="mt-10 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        <Sparkles size={14} /> Play-style matches combine genre affinity with experience engagement
        and discovery signals.
      </div>
    </>
  );
}
