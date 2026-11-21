import { Bookmark, Play, Sparkles, Star, TrendingUp } from 'lucide-react';
import type { Experience } from '@/types/experience';
import { formatCount } from '@/lib/utils';
import { ExperienceArtwork } from './ExperienceArtwork';
import { Button } from '@/components/ui/button';
import type { RankedExperience } from '@/features/discovery/engine/ranking';
import { RankingWhyPopover } from '@/features/discovery/components/RankingWhyPopover';

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
  return (
    <article className={`experience-card card-${variant}`}>
      <Button
        variant="ghost"
        className="card-art-button"
        onClick={() => onSelect(experience)}
        aria-label={`View ${experience.title}`}
      >
        <ExperienceArtwork src={experience.artwork.thumbnail} alt={experience.artwork.alt} />
        {variant === 'trending' && experience.metrics.weeklyChange !== undefined && (
          <span className="trend-pill">
            <TrendingUp size={12} /> +{experience.metrics.weeklyChange}%
          </span>
        )}
        {variant === 'recent' && <span className="new-pill">NEW</span>}
      </Button>
      <div className="card-content">
        {variant === 'recommended' && experience.matchScore !== undefined && (
          <span className="match-label">{experience.matchScore}% MATCH</span>
        )}
        <div className="card-title-row">
          <Button variant="ghost" className="card-title" onClick={() => onSelect(experience)}>
            {experience.title}
          </Button>
          {variant !== 'recent' && (
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
          )}
        </div>
        <p className="card-creator">
          {experience.creator} <span>·</span> {experience.subgenre}
        </p>
        {variant === 'recommended' && experience.discoveryReason && (
          <span className="recommendation-reason">
            <Sparkles size={11} /> {experience.discoveryReason}
          </span>
        )}
        {ranking && <RankingWhyPopover ranking={ranking} />}
        <div className="card-meta">
          <span className="active-count">
            <i /> {formatCount(experience.metrics.activePlayers)} active
          </span>
          <span className="rating">
            <Star size={12} fill="currentColor" /> {experience.metrics.rating}%
          </span>
        </div>
        <Button variant="outline" className="card-play-button" onClick={() => onSelect(experience)}>
          <Play size={12} fill="currentColor" />{' '}
          {variant === 'recommended' ? 'Play Now' : 'Quick Play'}
        </Button>
      </div>
    </article>
  );
}
