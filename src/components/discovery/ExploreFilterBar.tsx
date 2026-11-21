import { ArrowDownWideNarrow, Compass } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DiscoveryPersona, ExperienceGenre } from '@/types/experience';
import { GenreFilters } from './GenreFilters';

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
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Compass size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs font-medium text-muted-foreground">Play style</span>
          <Select
            value={persona || 'all'}
            onValueChange={(value) => onPersonaChange(value && value !== 'all' ? value : '')}
          >
            <SelectTrigger
              aria-label="Choose play style"
              className="h-9 w-[min(15rem,62vw)] rounded-xl bg-card"
            >
              <SelectValue placeholder="All play styles" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">All play styles</SelectItem>
              {personas.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span>{option.label}</span>
                    <span className="max-w-64 truncate text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <ArrowDownWideNarrow size={14} aria-hidden="true" />
          Ranked by relevance
        </span>
      </div>
    </div>
  );
}
