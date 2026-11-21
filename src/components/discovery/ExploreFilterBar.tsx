import type { DiscoveryPersona, ExperienceGenre } from '@/types/experience';
import { GenreFilters } from './GenreFilters';
import { PersonaCommandSelector } from './PersonaCommandSelector';

interface ExploreFilterBarProps {
  genre: ExperienceGenre | 'All';
  onGenreChange: (genre: ExperienceGenre | 'All') => void;
  personas: DiscoveryPersona[];
  persona: string;
  onPersonaChange: (persona: string) => void;
}

export function ExploreFilterBar({
  genre,
  onGenreChange,
  personas,
  persona,
  onPersonaChange,
}: ExploreFilterBarProps) {
  return (
    <div
      className="flex min-w-0 flex-col gap-3 border-b border-border pb-4"
      aria-label="Explore filters"
    >
      <div className="min-w-0 max-w-full md:hidden">
        <GenreFilters selected={genre} onSelect={onGenreChange} />
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <PersonaCommandSelector
          personas={personas}
          selectedPersonaId={persona}
          onSelect={onPersonaChange}
        />
        <span className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <span aria-hidden="true">↧</span>
          Ranked by relevance
        </span>
      </div>
    </div>
  );
}
