import {
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  Heart,
  Sparkles,
  Star,
  ThumbsUp,
} from 'lucide-react';
import type { Experience } from '@/types/experience';
import { formatCount, getRankScoreClass } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExperienceArtwork } from './ExperienceArtwork';
import { ExperiencePlayButton } from './ExperiencePlayButton';
import type { RankedExperience } from '@/features/discovery/engine/ranking';
import { RankingWhyPopover } from '@/features/discovery/components/RankingWhyPopover';
interface FeaturedExperienceProps {
  experience: Experience;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onPlay: (experience: Experience) => void;
  ranking?: RankedExperience;
}
export function FeaturedExperience({
  experience,
  isBookmarked,
  onToggleBookmark,
  onPlay,
  ranking,
}: FeaturedExperienceProps) {
  return (
    <section
      className="grid min-w-0 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]"
      aria-label="Featured experience"
    >
      <a
        href={`/games/?id=${encodeURIComponent(experience.id)}`}
        className="group relative aspect-video w-full self-center overflow-hidden bg-muted"
        aria-label={`Learn more about ${experience.title}`}
      >
        <ExperienceArtwork
          src={experience.artwork.hero ?? experience.artwork.thumbnail}
          alt={experience.artwork.alt}
          className="absolute inset-0 size-full"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-background/10" />
        <span
          className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/85 px-2.5 py-2 text-xs font-bold tracking-wide text-foreground backdrop-blur sm:left-4 sm:top-4 sm:gap-2 sm:px-3"
          aria-label="Featured spotlight"
          title="Featured spotlight"
        >
          <Sparkles size={15} aria-hidden="true" className="size-4 sm:size-[15px]" />
          <span className="hidden sm:inline">FEATURED SPOTLIGHT</span>
        </span>
        <span className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-lg border border-border bg-background/85 px-3 py-2 text-xs font-bold text-foreground backdrop-blur">
          <ThumbsUp size={14} className="text-emerald-500" />
          {experience.metrics.rating}% Positive
        </span>
      </a>
      <div className="flex min-w-0 flex-col justify-center gap-3 p-4 sm:p-5 md:p-6">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {[experience.genre, experience.subgenre, experience.tags[0] ?? experience.genre].map(
            (tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="rounded-md border border-border bg-secondary px-2 py-1 text-[0.7rem] text-secondary-foreground sm:px-2.5 sm:text-xs"
              >
                {tag}
              </span>
            ),
          )}
        </div>
        <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl md:text-3xl">
          {experience.title}
        </h2>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          By {experience.creator}
          {experience.creatorVerified && <BadgeCheck size={15} />}
        </p>
        <div className="relative">
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{experience.description}</p>
          <a
            href={`/games/?id=${encodeURIComponent(experience.id)}`}
            className="absolute bottom-0 right-0 inline-flex items-center gap-1 bg-card pl-1 text-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Read more about ${experience.title}`}
          >
            Read more <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>{formatCount(experience.metrics.activePlayers)} playing now</span>
          <span className="inline-flex items-center gap-1">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {experience.metrics.rating}% Positive
          </span>
          <span>{formatCount(experience.metrics.reviewCount)} reviews</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExperiencePlayButton onClick={() => onPlay(experience)} />
          <Button
            variant="outline"
            size="icon"
            onClick={() => onToggleBookmark(experience.id)}
            aria-label={isBookmarked ? 'Remove from library' : 'Save to library'}
            aria-pressed={isBookmarked}
          >
            {isBookmarked ? <Heart className="text-rose-500" fill="currentColor" /> : <Bookmark />}
          </Button>
        </div>
        {ranking && (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className={`text-sm font-semibold ${getRankScoreClass(ranking.score)}`}>
              {ranking.score.toFixed(1)}{' '}
              <span className="text-xs text-muted-foreground">RANK SCORE</span>
            </span>
            <RankingWhyPopover ranking={ranking} showScore={false} />
          </div>
        )}
      </div>
    </section>
  );
}
