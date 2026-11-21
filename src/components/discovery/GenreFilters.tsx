import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GENRE_FILTER_OPTIONS, type ExperienceGenre } from '@/types/experience';

const genres = GENRE_FILTER_OPTIONS;

interface GenreFiltersProps {
  selected: ExperienceGenre | 'All';
  onSelect: (genre: ExperienceGenre | 'All') => void;
}

export function GenreFilters({ selected, onSelect }: GenreFiltersProps) {
  return (
    <Tabs
      className="genre-tabs"
      value={selected}
      onValueChange={(value) => {
        if (genres.some((genre) => genre.value === value)) {
          onSelect(value as ExperienceGenre | 'All');
        }
      }}
    >
      <TabsList className="genre-filters" aria-label="Filter experiences by genre">
        {genres.map((genre) => (
          <TabsTrigger
            key={genre.value}
            value={genre.value}
            className={`genre-chip ${selected === genre.value ? 'is-selected' : ''}`}
          >
            {genre.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
