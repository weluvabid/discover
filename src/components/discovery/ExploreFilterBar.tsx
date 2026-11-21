import { ArrowDownWideNarrow } from 'lucide-react';
import { GenreFilters } from './GenreFilters';
import type { ExperienceGenre } from '@/types/experience';

interface ExploreFilterBarProps {
  genre: ExperienceGenre | 'All';
  onGenreChange: (genre: ExperienceGenre | 'All') => void;
}

export function ExploreFilterBar({ genre, onGenreChange }: ExploreFilterBarProps) {
  return (
    <div className="explore-filter-bar" aria-label="Explore filters">
      <GenreFilters selected={genre} onSelect={onGenreChange} />
      <span className="explore-sort-indicator"><ArrowDownWideNarrow size={13} /> Ranked by relevance</span>
    </div>
  );
}
