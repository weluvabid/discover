import type { ReactNode } from 'react';
import { Compass } from 'lucide-react';
import type { RankedExperience } from '@/features/discovery/engine/ranking';
import type { Experience } from '@/types/experience';
import { ExperienceCard } from '@/components/experience/ExperienceCard';
import { ExperienceCardSkeleton } from '@/components/experience/ExperienceCardSkeleton';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { SectionHeader } from './SectionHeader';

interface ExperienceSectionProps {
  title: string;
  experiences: Experience[];
  variant: 'trending' | 'recommended' | 'recent';
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onPlay: (experience: Experience) => void;
  action?: ReactNode;
  subtitle?: string;
  emptyMessage?: string;
  emptyTitle?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  rankingById?: Map<string, RankedExperience>;
  rankingLabel?: string;
  loading?: boolean;
  hideHeader?: boolean;
}

export function ExperienceSection({
  title,
  experiences,
  variant,
  bookmarks,
  onToggleBookmark,
  onPlay,
  action,
  subtitle,
  emptyMessage = 'Nothing to show here yet.',
  emptyTitle = 'No experiences found',
  emptyIcon = <Compass aria-hidden="true" />,
  emptyAction,
  rankingById,
  rankingLabel,
  loading = false,
  hideHeader = false,
}: ExperienceSectionProps) {
  return (
    <section className="mt-8 min-w-0">
      {!hideHeader && <SectionHeader title={title} subtitle={subtitle} action={action} />}
      {loading ? (
        <div
          className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          role="status"
          aria-label={`Loading ${title.toLowerCase()}`}
        >
          {Array.from({ length: 4 }, (_, index) => (
            <ExperienceCardSkeleton key={index} />
          ))}
        </div>
      ) : experiences.length === 0 ? (
        <Empty className="rounded-2xl border border-border bg-card py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">{emptyIcon}</EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyMessage}</EmptyDescription>
          </EmptyHeader>
          {emptyAction && <EmptyContent>{emptyAction}</EmptyContent>}
        </Empty>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {experiences.map((experience) => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              ranking={rankingById?.get(experience.id)}
              rankingLabel={rankingLabel}
              variant={variant}
              isBookmarked={bookmarks.includes(experience.id)}
              onToggleBookmark={onToggleBookmark}
              onPlay={onPlay}
            />
          ))}
        </div>
      )}
    </section>
  );
}
