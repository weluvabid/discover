import { BadgeCheck, Heart, Sparkles, Star, ThumbsUp } from 'lucide-react';
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
  const voteCount = experience.metrics.voteCount ?? experience.metrics.reviewCount;
  const genreTags = [
    ...new Set(
      [experience.genre, experience.subgenre, experience.tags[0] ?? experience.genre].filter(
        Boolean,
      ),
    ),
  ];

  return (
    <section
      className="grid min-w-0 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]"
      aria-label="Featured experience"
    >
      <div className="group relative aspect-video w-full self-center overflow-hidden bg-muted">
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
        <span className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-lg border border-border bg-background/90 px-3 py-2 text-xs font-bold text-foreground backdrop-blur">
          <ThumbsUp size={14} className="text-emerald-400" />
          {experience.metrics.rating === undefined
            ? 'Rating unavailable'
            : `${experience.metrics.rating.toFixed(1)}% Positive`}
          {experience.source && (
            <span className="border-l border-border pl-2 text-muted-foreground">
              Roblox #{experience.source.nativePosition}
            </span>
          )}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5 md:p-6">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {genreTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-border bg-secondary px-2 py-1 text-[0.7rem] text-secondary-foreground sm:px-2.5 sm:text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
        <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl md:text-3xl">
          {experience.title}
        </h2>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          By {experience.creator}
          {experience.creatorVerified && <BadgeCheck size={15} />}
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>
            {experience.metrics.activePlayers === undefined
              ? 'Player count unavailable'
              : `${formatCount(experience.metrics.activePlayers)} playing now`}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {experience.metrics.rating === undefined
              ? 'Rating unavailable'
              : `${experience.metrics.rating.toFixed(1)}% Positive`}
          </span>
          <span>
            {voteCount === undefined ? 'Vote count unavailable' : `${formatCount(voteCount)} votes`}
          </span>
        </div>
        <div className="mt-auto space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ExperiencePlayButton onClick={() => onPlay(experience)} />
            <Button
              variant="outline"
              size="icon"
              onClick={() => onToggleBookmark(experience.id)}
              aria-label={isBookmarked ? 'Remove from library' : 'Save to library'}
              aria-pressed={isBookmarked}
            >
              <Heart
                className={isBookmarked ? 'text-rose-500' : undefined}
                fill={isBookmarked ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
            </Button>
          </div>
          {ranking && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className={`text-sm font-semibold ${getRankScoreClass(ranking.score)}`}>
                {ranking.score.toFixed(1)}{' '}
                <span className="text-xs text-muted-foreground">FEATURED SCORE</span>
              </span>
              <RankingWhyPopover ranking={ranking} showScore={false} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
