import type { ReactNode } from 'react';
import type { RankedExperience } from '@/features/discovery/engine/ranking';
import type { Experience } from '@/types/experience';
import { RankedExperienceRow } from '@/components/experience/RankedExperienceRow';
import { ExperienceCard } from '@/components/experience/ExperienceCard';
import { SectionHeader } from './SectionHeader';

interface ExperienceSectionProps {
  title: string;
  experiences: Experience[];
  variant: 'trending' | 'recommended' | 'recent';
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onSelect: (experience: Experience) => void;
  action?: ReactNode;
  subtitle?: string;
  emptyMessage?: string;
  rankingById?: Map<string, RankedExperience>;
  layout?: 'grid' | 'ranked-list';
}

export function ExperienceSection({
  title,
  experiences,
  variant,
  bookmarks,
  onToggleBookmark,
  onSelect,
  action,
  subtitle,
  emptyMessage = 'Nothing to show here yet.',
  rankingById,
  layout = 'grid',
}: ExperienceSectionProps) {
  return (
    <section className={`discovery-section section-${variant}`}>
      <SectionHeader title={title} subtitle={subtitle} action={action} />
      {experiences.length === 0 ? (
        <p className="empty-state">{emptyMessage}</p>
      ) : layout === 'ranked-list' ? (
        <div className="ranked-experience-list">
          {experiences.map((experience) => {
            const ranking = rankingById?.get(experience.id);
            if (!ranking) return null;

            return (
              <RankedExperienceRow
                key={experience.id}
                ranking={ranking}
                isBookmarked={bookmarks.includes(experience.id)}
                onToggleBookmark={onToggleBookmark}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      ) : (
        <div className={`experience-grid grid-${variant}`}>
          {experiences.map((experience) => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              ranking={rankingById?.get(experience.id)}
              variant={variant}
              isBookmarked={bookmarks.includes(experience.id)}
              onToggleBookmark={onToggleBookmark}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}
