import { ArrowRight, Bookmark, ChevronRight, Gem, Sparkles, TrendingUp } from 'lucide-react';
import { experiences } from '@/data/mocks/experiences';
import {
  featuredExperience,
  hiddenGemExperiences,
  recentlyLaunchedExperiences,
  trendingExperiences,
} from '@/data/mocks/catalog';
import { ExperienceSection } from '@/components/discovery/ExperienceSection';
import { HiddenGems } from '@/components/discovery/HiddenGems';
import { FeaturedExperience } from '@/components/experience/FeaturedExperience';
import { CollectionsView } from './CollectionsView';
import { PageIntro } from './PageIntro';
import type { DiscoveryView, Experience } from '@/types/experience';

interface DiscoverViewProps {
  activeView: DiscoveryView;
  bookmarks: string[];
  savedExperiences: Experience[];
  recommendations: Experience[];
  onToggleBookmark: (id: string) => void;
  onSelect: (experience: Experience) => void;
  onNavigate: (view: DiscoveryView) => void;
}

export function DiscoverView({
  activeView,
  bookmarks,
  savedExperiences,
  recommendations,
  onToggleBookmark,
  onSelect,
  onNavigate,
}: DiscoverViewProps) {
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
