import { Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getPersonaAvatarUrl } from '@/lib/persona-avatar';
import type { DiscoveryPersona } from '@/types/experience';

interface CAvatar24Props {
  personas: DiscoveryPersona[];
  selectedPersonaId: string;
  onSelect: (personaId: string) => void;
}

/**
 * ReUI c-avatar-24 avatar fan adapted for selectable discovery personas.
 * The avatar itself is a keyboard-focusable button, unlike the registry's
 * hover-only span trigger, so every persona remains accessible without a mouse.
 */
export function CAvatar24({ personas, selectedPersonaId, onSelect }: CAvatar24Props) {
  const ordered = [...personas].sort((a, b) => {
    if (a.id === selectedPersonaId) return -1;
    if (b.id === selectedPersonaId) return 1;
    return 0;
  });

  return (
    <div className="group/avatar-fan min-w-0 overflow-x-auto py-1 pl-1 pr-2">
      <AvatarGroup
        className="w-max items-center transition-[gap] duration-200 hover:gap-1 hover:space-x-0"
        role="group"
        aria-label="Choose a play style"
      >
        {!selectedPersonaId && <AllPlayStylesButton onSelect={onSelect} selected />}
        {ordered.map((persona) => {
          const selected = selectedPersonaId === persona.id;
          return (
            <Tooltip key={persona.id}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => onSelect(selected ? '' : persona.id)}
                    aria-label={persona.label}
                    aria-pressed={selected}
                    className={`relative shrink-0 rounded-full border-2 bg-card p-0.5 ring-2 ring-background transition-[transform,border-color,background-color] hover:z-30 hover:scale-110 focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selected
                        ? 'z-20 border-primary bg-primary/20 ring-primary/40 ring-offset-2 ring-offset-background'
                        : 'border-border hover:border-ring/70'
                    }`}
                  />
                }
              >
                <Avatar className="size-[27px] border-0 after:hidden sm:size-[30px]">
                  <AvatarImage src={getPersonaAvatarUrl(persona.id)} alt="" />
                  <AvatarFallback>{persona.label.slice(0, 1)}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{persona.label}</TooltipContent>
            </Tooltip>
          );
        })}
        {selectedPersonaId && <AllPlayStylesButton onSelect={onSelect} selected={false} />}
      </AvatarGroup>
    </div>
  );
}

function AllPlayStylesButton({
  onSelect,
  selected,
}: {
  onSelect: (id: string) => void;
  selected: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => onSelect('')}
            aria-label="All play styles"
            aria-pressed={selected}
            className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 bg-card text-muted-foreground ring-2 ring-background transition-transform hover:z-30 hover:scale-110 focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-9 ${
              selected ? 'border-primary bg-primary/20 text-foreground' : 'border-border'
            }`}
          />
        }
      >
        <Sparkles size={15} aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>All play styles</TooltipContent>
    </Tooltip>
  );
}
