import { ArrowUpRight, Gem, Play, Sparkles } from 'lucide-react';
import type { Experience } from '@/types/experience';
import { formatCount } from '@/lib/utils';
import { ExperienceArtwork } from '@/components/experience/ExperienceArtwork';
import { SectionHeader } from './SectionHeader';

interface HiddenGemsProps {
  experiences: Experience[];
  onSelect: (experience: Experience) => void;
}

export function HiddenGems({ experiences, onSelect }: HiddenGemsProps) {
  return (
    <section className="discovery-section hidden-gems-section">
      <SectionHeader
        title="Hidden Gems"
        subtitle="Lesser-known worlds with exceptional ratings, strong retention, and dedicated communities."
        icon={<Gem size={16} />}
        action={
          <span className="section-note">
            <Sparkles size={13} /> Hand-curated
          </span>
        }
      />
      <div className="hidden-gem-list">
        {experiences.map((experience) => (
          <article className="hidden-gem-row" key={experience.id}>
            <button
              className="gem-art-button"
              onClick={() => onSelect(experience)}
              aria-label={`View ${experience.title}`}
            >
              <ExperienceArtwork src={experience.artwork.thumbnail} alt={experience.artwork.alt} />
            </button>
            <div className="gem-info">
              <button className="gem-title" onClick={() => onSelect(experience)}>
                {experience.title}
              </button>
              <p>
                By {experience.creator} <span>·</span> {experience.subgenre}
              </p>
              <span className="gem-reason">
                <Sparkles size={12} /> Discovery reason: {experience.discoveryReason}
              </span>
            </div>
            <div className="gem-rating">
              <strong>{experience.metrics.rating}%</strong>
              <span>Positive</span>
            </div>
            <div className="gem-players">
              <small>Active Players</small>
              <strong>
                {formatCount(experience.metrics.activePlayers)} <span>playing</span>
              </strong>
            </div>
            <button
              className="gem-play"
              onClick={() => onSelect(experience)}
              aria-label={`Play ${experience.title}`}
            >
              <Play size={14} fill="currentColor" />
            </button>
            <ArrowUpRight className="gem-arrow" size={15} />
          </article>
        ))}
      </div>
    </section>
  );
}
