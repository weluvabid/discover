import { Bookmark } from 'lucide-react';
import type { RankedExperience } from '@/features/discovery/engine/ranking';
import { formatCount } from '@/lib/utils';
import { RankingWhyPopover } from '@/features/discovery/components/RankingWhyPopover';
import { ExperienceArtwork } from './ExperienceArtwork';

interface RankedExperienceRowProps {
  ranking: RankedExperience;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onSelect: (experience: RankedExperience['experience']) => void;
}

export function RankedExperienceRow({
  ranking,
  isBookmarked,
  onToggleBookmark,
  onSelect,
}: RankedExperienceRowProps) {
  const { experience } = ranking;

  return (
    <article className="ranked-experience-row">
      <div className="ranked-position">
        <strong>#{ranking.position}</strong>
        <span>—</span>
      </div>
      <button
        className="ranked-artwork"
        onClick={() => onSelect(experience)}
        aria-label={`View ${experience.title}`}
      >
        <ExperienceArtwork src={experience.artwork.thumbnail} alt={experience.artwork.alt} />
      </button>
      <button className="ranked-experience-copy" onClick={() => onSelect(experience)}>
        <strong>{experience.title}</strong>
        <span>
          {experience.subgenre} · {formatCount(experience.metrics.activePlayers)} active
        </span>
      </button>
      <RankingWhyPopover ranking={ranking} />
      <button
        className={`ranked-bookmark ${isBookmarked ? 'is-bookmarked' : ''}`}
        onClick={() => onToggleBookmark(experience.id)}
        aria-label={
          isBookmarked ? `Remove ${experience.title} from library` : `Save ${experience.title}`
        }
        aria-pressed={isBookmarked}
      >
        <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}
