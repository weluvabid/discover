import {
  ArrowUpRight,
  Bookmark,
  Minus,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { Experience } from '@/types/experience';
import { formatCount, formatSignedPercent, getRankScoreClass } from '@/lib/utils';
import { ExperienceArtwork } from './ExperienceArtwork';
import { Button } from '@/components/ui/button';
import type { RankedExperience } from '@/features/discovery/engine/ranking';
import { RankingWhyPopover } from '@/features/discovery/components/RankingWhyPopover';
import { ExperiencePlayButton } from './ExperiencePlayButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ExperienceCardProps {
  experience: Experience;
  variant?: 'trending' | 'recommended' | 'recent';
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onPlay: (experience: Experience) => void;
  ranking?: RankedExperience;
  rankingLabel?: string;
}

export function ExperienceCard({
  experience,
  variant = 'trending',
  isBookmarked,
  onToggleBookmark,
  onPlay,
  ranking,
  rankingLabel,
}: ExperienceCardProps) {
  const weeklyChange = experience.metrics.weeklyChange;
  const formattedWeeklyChange =
    weeklyChange === undefined ? null : formatSignedPercent(weeklyChange);
  const overlayLabel =
    variant === 'trending' && formattedWeeklyChange !== null
      ? formattedWeeklyChange
      : variant === 'recommended' && experience.matchScore !== undefined
        ? `${experience.matchScore}% MATCH`
        : variant === 'recent'
          ? 'NEW'
          : null;

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-ring/60">
      <a
        href={`/games/?id=${encodeURIComponent(experience.id)}`}
        className="relative block overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-label={`Learn more about ${experience.title}`}
      >
        <ExperienceArtwork
          src={experience.artwork.thumbnail}
          alt={experience.artwork.alt}
          className="aspect-video w-full"
        />
        {overlayLabel && (
          <span
            className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold shadow-sm backdrop-blur ${
              'border-border bg-background/90 text-foreground'
            }`}
          >
            {variant === 'trending' && weeklyChange !== undefined &&
              (weeklyChange > 0 ? (
                <TrendingUp size={13} className="text-emerald-400" />
              ) : weeklyChange < 0 ? (
                <TrendingDown size={13} className="text-rose-400" />
              ) : (
                <Minus size={13} className="text-amber-400" />
              ))}
            {variant === 'recommended' && <Sparkles size={13} />}
            {overlayLabel}
          </span>
        )}
        {ranking && (
          <span className="absolute right-3 top-3 rounded-lg border border-border bg-background/85 px-2 py-1 text-xs font-bold text-foreground backdrop-blur">
            #{ranking.position}
          </span>
        )}
      </a>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex min-w-0 items-center gap-2">
          <a
            href={`/games/?id=${encodeURIComponent(experience.id)}`}
            className="min-w-0 truncate text-base font-bold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {experience.title}
          </a>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onToggleBookmark(experience.id)}
                    aria-label={
                      isBookmarked
                        ? `Remove ${experience.title} from library`
                        : `Save ${experience.title}`
                    }
                    aria-pressed={isBookmarked}
                  />
                }
              >
                <Bookmark
                  size={16}
                  className={isBookmarked ? 'text-rose-500' : undefined}
                  fill={isBookmarked ? 'currentColor' : 'none'}
                />
              </TooltipTrigger>
              <TooltipContent>
                {isBookmarked ? 'Remove from library' : 'Save to library'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <a
                    href={`/games/?id=${encodeURIComponent(experience.id)}`}
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Learn more about ${experience.title}`}
                  />
                }
              >
                <ArrowUpRight size={16} />
              </TooltipTrigger>
              <TooltipContent>Learn more</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {experience.creator} <span aria-hidden="true">·</span> {experience.subgenre}
        </p>
        {variant === 'recommended' && experience.discoveryReason && (
          <p className="flex items-center gap-2 truncate rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
            <Sparkles size={13} className="shrink-0" />
            {experience.discoveryReason}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            {formatCount(experience.metrics.activePlayers)} active
          </span>
          <span className="inline-flex items-center gap-1">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            {experience.metrics.rating}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ExperiencePlayButton
            onClick={() => onPlay(experience)}
            label="Play on Roblox"
            className="min-w-0 flex-1"
          />
        </div>
        {ranking && (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <div className="flex items-baseline gap-2">
              <strong className={`text-lg tabular-nums ${getRankScoreClass(ranking.score)}`}>
                {ranking.score.toFixed(1)}
              </strong>
              <span className="text-[0.65rem] font-bold tracking-wider text-muted-foreground">
                {rankingLabel ??
                  (variant === 'trending'
                    ? 'TRENDING SCORE'
                    : variant === 'recent'
                      ? 'RECENT SCORE'
                      : 'RECOMMENDED SCORE')}
              </span>
            </div>
            <RankingWhyPopover ranking={ranking} showScore={false} />
          </div>
        )}
      </div>
    </article>
  );
}
