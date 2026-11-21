import { Bookmark, Sparkles, Star, TrendingUp } from 'lucide-react';
import type { Experience } from '@/types/experience';
import { formatCount } from '@/lib/utils';
import { ExperienceArtwork } from './ExperienceArtwork';
import { Button } from '@/components/ui/button';
import type { RankedExperience } from '@/features/discovery/engine/ranking';
import { RankingWhyPopover } from '@/features/discovery/components/RankingWhyPopover';
import { ExperiencePlayButton } from './ExperiencePlayButton';

interface ExperienceCardProps {
  experience: Experience;
  variant?: 'trending' | 'recommended' | 'recent';
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onSelect: (experience: Experience) => void;
  ranking?: RankedExperience;
}

export function ExperienceCard({
  experience,
  variant = 'trending',
  isBookmarked,
  onToggleBookmark,
  onSelect,
  ranking,
}: ExperienceCardProps) {
  const overlayLabel =
    variant === 'trending' && experience.metrics.weeklyChange !== undefined
      ? `+${experience.metrics.weeklyChange}%`
      : variant === 'recommended' && experience.matchScore !== undefined
        ? `${experience.matchScore}% MATCH`
        : variant === 'recent'
          ? 'NEW'
          : null;

  return (
    <article className="experience-card">
      <Button
        variant="ghost"
        className="card-art-button"
        onClick={() => onSelect(experience)}
        aria-label={`View ${experience.title}`}
      >
        <ExperienceArtwork src={experience.artwork.thumbnail} alt={experience.artwork.alt} />
        {overlayLabel && (
          <span className="experience-art-badge">
            {variant === 'trending' && <TrendingUp size={13} aria-hidden="true" />}
            {variant === 'recommended' && <Sparkles size={13} aria-hidden="true" />}
            {overlayLabel}
          </span>
        )}
        {ranking && <span className="experience-rank-badge">#{ranking.position}</span>}
      </Button>

      <div className="card-content">
        <div className="card-title-row">
          <Button variant="ghost" className="card-title" onClick={() => onSelect(experience)}>
            {experience.title}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className={`bookmark-button ${isBookmarked ? 'is-bookmarked' : ''}`}
            onClick={() => onToggleBookmark(experience.id)}
            aria-label={
              isBookmarked
                ? `Remove ${experience.title} from library`
                : `Save ${experience.title}`
            }
            aria-pressed={isBookmarked}
          >
            <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
          </Button>
        </div>

        <p className="card-creator">
          {experience.creator} <span>·</span> {experience.subgenre}
        </p>

        {variant === 'recommended' && experience.discoveryReason && (
          <span className="recommendation-reason">
            <Sparkles size={12} aria-hidden="true" /> {experience.discoveryReason}
          </span>
        )}

        <div className="card-meta">
          <span className="active-count">
            <i /> {formatCount(experience.metrics.activePlayers)} active
          </span>
          <span className="rating">
            <Star size={12} fill="currentColor" /> {experience.metrics.rating}%
          </span>
        </div>

        <ExperiencePlayButton
          onClick={() => onSelect(experience)}
          label="Play on Roblox"
        />

        {ranking && (
          <div className="card-ranking-meta">
            <div className="card-ranking-score">
              <strong>{ranking.score.toFixed(1)}</strong>
              <small>RANK SCORE</small>
              <RankingWhyPopover ranking={ranking} showScore={false} />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
