import { Compass, Sparkles } from 'lucide-react';
import type { DiscoveryPersona, ExperienceGenre } from '@/types/experience';
import { GenreFilters } from './GenreFilters';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getPersonaAvatarUrl } from '@/lib/persona-avatar';

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
  const selectedPersona = personas.find((item) => item.id === persona);

  return (
    <div
      className="flex min-w-0 flex-col gap-3 border-b border-border pb-4"
      aria-label="Explore filters"
    >
      <div className="min-w-0 max-w-full md:hidden">
        <GenreFilters selected={genre} onSelect={onGenreChange} />
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex shrink-0 items-center gap-2">
            <Compass size={15} className="text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-medium text-muted-foreground">Play style</span>
            <span className="hidden text-xs text-foreground sm:inline">
              {selectedPersona?.label ?? 'All'}
            </span>
          </div>
          <div
            className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto py-1 pr-1"
            role="group"
            aria-label="Choose a play style"
          >
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => onPersonaChange('')}
                    aria-label="All play styles"
                    aria-pressed={!persona}
                    className={`grid size-9 shrink-0 place-items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!persona ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-muted-foreground hover:border-ring/60 hover:text-foreground'}`}
                  />
                }
              >
                <Sparkles size={16} aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>All play styles</TooltipContent>
            </Tooltip>
            {personas.map((option) => {
              const selected = persona === option.id;
              return (
                <Tooltip key={option.id}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => onPersonaChange(selected ? '' : option.id)}
                        aria-label={option.label}
                        aria-pressed={selected}
                        className={`size-9 shrink-0 overflow-hidden rounded-full border-2 bg-secondary transition-[border-color,transform] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${selected ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:border-ring/60'}`}
                      />
                    }
                  >
                    <img
                      src={getPersonaAvatarUrl(option.id)}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                    />
                  </TooltipTrigger>
                  <TooltipContent>{option.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <span aria-hidden="true">↧</span>
          Ranked by relevance
        </span>
      </div>
    </div>
  );
}
