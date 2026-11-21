import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EXPERIENCE_GENRES, type ExperienceGenre } from '@/types/experience';

const genres: Array<ExperienceGenre | 'All'> = ['All', ...EXPERIENCE_GENRES];

interface GenreFiltersProps {
  selected: ExperienceGenre | 'All';
  onSelect: (genre: ExperienceGenre | 'All') => void;
}

export function GenreFilters({ selected, onSelect }: GenreFiltersProps) {
  return (
    <Tabs
      value={selected}
      onValueChange={(value) => {
        if (genres.includes(value as ExperienceGenre | 'All')) {
          onSelect(value as ExperienceGenre | 'All');
        }
      }}
    >
      <TabsList className="genre-filters" aria-label="Filter experiences by genre">
        {genres.map((genre) => (
          <TabsTrigger
            key={genre}
            value={genre}
            className={`genre-chip ${selected === genre ? 'is-selected' : ''}`}
          >
            {genre}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
