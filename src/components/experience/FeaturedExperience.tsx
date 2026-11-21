import { BadgeCheck, Bookmark, Heart, ThumbsUp, ArrowUpRight } from 'lucide-react';
import type { Experience } from '@/types/experience';
import { formatCount } from '@/lib/utils';
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
      <a href={`/games/?id=${encodeURIComponent(experience.id)}`} className="group relative aspect-video w-full self-center overflow-hidden bg-muted" aria-label={`Learn more about ${experience.title}`}>
        <ExperienceArtwork
          src={experience.artwork.hero ?? experience.artwork.thumbnail}
          alt={experience.artwork.alt}
          className="absolute inset-0 size-full"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-background/10" />
        <span className="absolute left-4 top-4 rounded-lg border border-border bg-background/85 px-3 py-2 text-xs font-bold tracking-wide text-foreground backdrop-blur">
          FEATURED SPOTLIGHT
        </span>
        <span className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-lg border border-border bg-background/85 px-3 py-2 text-xs font-bold text-foreground backdrop-blur">
          <ThumbsUp size={14} />
          {experience.metrics.rating}% Positive
        </span>
      </a>
      <div className="flex min-w-0 flex-col justify-center gap-3 p-5 md:p-6">
        <div className="flex flex-wrap gap-2">
          {[experience.genre, experience.subgenre, experience.tags[0] ?? experience.genre].map(
            (tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
              >
                {tag}
              </span>
            ),
          )}
        </div>
        <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl">
          {experience.title}
        </h2>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          By {experience.creator}
          {experience.creatorVerified && <BadgeCheck size={15} />}
        </p>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{experience.description}</p>
        <a
          href={`/games/?id=${encodeURIComponent(experience.id)}`}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Read more about ${experience.title}`}
        >
          Read more <ArrowUpRight size={15} />
        </a>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>{formatCount(experience.metrics.activePlayers)} playing now</span>
          <span>{experience.metrics.rating}% Positive</span>
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
            {isBookmarked ? <Heart fill="currentColor" /> : <Bookmark />}
          </Button>
        </div>
        {ranking && (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-semibold text-foreground">
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
