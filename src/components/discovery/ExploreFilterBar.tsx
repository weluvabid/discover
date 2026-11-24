import type { ExperienceGenre } from '@/types/experience';
import { GenreFilters } from './GenreFilters';

interface ExploreFilterBarProps {
  genre: ExperienceGenre | 'All';
  onGenreChange: (genre: ExperienceGenre | 'All') => void;
}

export function ExploreFilterBar({
  genre,
  onGenreChange,
}: ExploreFilterBarProps) {
  return (
    <div
      className="flex min-w-0 flex-col gap-3 border-b border-border pb-4"
      aria-label="Explore filters"
    >
      <div className="min-w-0 max-w-full md:hidden">
        <GenreFilters selected={genre} onSelect={onGenreChange} />
      </div>
    </div>
  );
}
