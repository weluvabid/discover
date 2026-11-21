import { ArrowDownWideNarrow } from 'lucide-react';
import { GenreFilters } from './GenreFilters';
import type { ExperienceGenre } from '@/types/experience';

interface ExploreFilterBarProps {
  genre: ExperienceGenre | 'All';
  onGenreChange: (genre: ExperienceGenre | 'All') => void;
}

export function ExploreFilterBar({ genre, onGenreChange }: ExploreFilterBarProps) {
  return (
    <div
      className="flex min-w-0 flex-col gap-3 border-b border-border pb-4"
      aria-label="Explore filters"
    >
      <div className="min-w-0 max-w-full md:hidden">
        <GenreFilters selected={genre} onSelect={onGenreChange} />
      </div>
      <div className="flex justify-end">
        <span className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <ArrowDownWideNarrow size={14} aria-hidden="true" />
          Ranked by relevance
        </span>
      </div>
    </div>
  );
}
