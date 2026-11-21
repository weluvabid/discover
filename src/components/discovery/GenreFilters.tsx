import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GENRE_FILTER_OPTIONS, type ExperienceGenre } from '@/types/experience';

interface GenreFiltersProps {
  selected: ExperienceGenre | 'All';
  onSelect: (genre: ExperienceGenre | 'All') => void;
}

export function GenreFilters({ selected, onSelect }: GenreFiltersProps) {
  return (
    <Tabs
      className="min-w-0 max-w-full"
      value={selected}
      onValueChange={(value) => {
        if (GENRE_FILTER_OPTIONS.some((genre) => genre.value === value))
          onSelect(value as ExperienceGenre | 'All');
      }}
    >
      <TabsList
        aria-label="Filter experiences by genre"
        className="flex h-auto w-full max-w-full flex-nowrap justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0"
      >
        {GENRE_FILTER_OPTIONS.map((genre) => (
          <TabsTrigger
            key={genre.value}
            value={genre.value}
            className="h-9 flex-none rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground data-active:border-primary/60 data-active:bg-primary/15 data-active:text-foreground sm:h-10 sm:px-4 sm:text-base"
          >
            {genre.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
