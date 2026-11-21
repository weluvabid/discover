import { EXPERIENCE_GENRES, type ExperienceGenre } from '@/types/experience';

const genres: Array<ExperienceGenre | 'All'> = ['All', ...EXPERIENCE_GENRES];

interface GenreFiltersProps {
  selected: ExperienceGenre | 'All';
  onSelect: (genre: ExperienceGenre | 'All') => void;
}

export function GenreFilters({ selected, onSelect }: GenreFiltersProps) {
  return (
    <div className="genre-filters" role="group" aria-label="Filter experiences by genre">
      {genres.map((genre) => (
        <button
          key={genre}
          className={`genre-chip ${selected === genre ? 'is-selected' : ''}`}
          onClick={() => onSelect(genre)}
          aria-pressed={selected === genre}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}
