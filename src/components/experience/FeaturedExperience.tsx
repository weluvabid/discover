import { BadgeCheck, Bookmark, Gamepad2, Heart, Play, ThumbsUp } from 'lucide-react';
import type { Experience } from '@/types/experience';
import { formatCount } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExperienceArtwork } from './ExperienceArtwork';
import type { RankedExperience } from '@/features/discovery/engine/ranking';
import { RankingWhyPopover } from '@/features/discovery/components/RankingWhyPopover';

interface FeaturedExperienceProps {
  experience: Experience;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onSelect: (experience: Experience) => void;
  ranking?: RankedExperience;
}

export function FeaturedExperience({
  experience,
  isBookmarked,
  onToggleBookmark,
  onSelect,
  ranking,
}: FeaturedExperienceProps) {
  return (
    <section className="featured-card" aria-label="Featured experience">
      <div className="featured-media">
        <ExperienceArtwork
          src={experience.artwork.hero ?? experience.artwork.thumbnail}
          alt={experience.artwork.alt}
          className="featured-art"
          loading="eager"
          fetchPriority="high"
        />
        <div className="featured-shade" />
        <span className="featured-label">
          <i /> FEATURED SPOTLIGHT
        </span>
        <span className="featured-rating">
          <ThumbsUp size={13} /> {experience.metrics.rating}% Positive
        </span>
      </div>
      <div className="featured-copy">
        <div className="genre-tags">
          <span>{experience.genre}</span>
          <span>{experience.subgenre}</span>
          <span>{experience.tags[0] ?? experience.genre}</span>
        </div>
        <h1>{experience.title}</h1>
        <p className="featured-creator">
          By {experience.creator} {experience.creatorVerified && <BadgeCheck size={15} />}
        </p>
        <p className="featured-description">{experience.description}</p>
        <div className="featured-stats">
          <span>
            <i /> <strong>{formatCount(experience.metrics.activePlayers)}</strong> playing now
          </span>
          <span className="positive-stat">
            {experience.metrics.rating}% <small>Positive</small>
          </span>
          <span>
            {formatCount(experience.metrics.reviewCount)} <small>reviews</small>
          </span>
        </div>
        {ranking && <RankingWhyPopover ranking={ranking} />}
        <div className="featured-actions">
          <Button className="primary-button" onClick={() => onSelect(experience)}>
            <Gamepad2 size={17} /> Play on Roblox <Play size={13} fill="currentColor" />
          </Button>
          <button
            className={`featured-save ${isBookmarked ? 'is-bookmarked' : ''}`}
            onClick={() => onToggleBookmark(experience.id)}
            aria-label={isBookmarked ? 'Remove from library' : 'Save to library'}
            aria-pressed={isBookmarked}
          >
            {isBookmarked ? <Heart size={18} fill="currentColor" /> : <Bookmark size={18} />}
          </button>
        </div>
      </div>
    </section>
  );
}
