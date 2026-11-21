import type { ReactNode } from 'react';
import type { Experience } from '@/types/experience';
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
}: ExperienceSectionProps) {
  return (
    <section className={`discovery-section section-${variant}`}>
      <SectionHeader title={title} subtitle={subtitle} action={action} />
      {experiences.length > 0 ? (
        <div className={`experience-grid grid-${variant}`}>
          {experiences.map((experience) => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              variant={variant}
              isBookmarked={bookmarks.includes(experience.id)}
              onToggleBookmark={onToggleBookmark}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <p className="empty-state">{emptyMessage}</p>
      )}
    </section>
  );
}
