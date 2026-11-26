import { Fragment, useEffect, useState } from 'react';
import { Check, CheckCircle2, Sparkles } from 'lucide-react';
import type { DiscoveryPersona } from '@/types/experience';
import { getPersonaAvatarUrl } from '@/lib/persona-avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

interface PersonaCommandSelectorProps {
  personas: DiscoveryPersona[];
  personasLoading?: boolean;
  selectedPersonaId: string;
  onSelect: (personaId: string) => void;
}

/** ReUI command-palette pattern for choosing a discovery persona. */
export function PersonaCommandSelector({
  personas,
  personasLoading = false,
  selectedPersonaId,
  onSelect,
}: PersonaCommandSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeCommandValue, setActiveCommandValue] = useState('');

  useEffect(() => {
    const handleOpen = () => {
      setActiveCommandValue('');
      setOpen(true);
    };

    window.addEventListener('discover:open-persona-selector', handleOpen);

    return () => window.removeEventListener('discover:open-persona-selector', handleOpen);
  }, []);

  if (personasLoading) {
    return <Skeleton className="size-11 rounded-full" aria-hidden="true" />;
  }

  const selectedPersona = personas.find((persona) => persona.id === selectedPersonaId);
  const orderedPersonas = selectedPersona
    ? [selectedPersona, ...personas.filter((persona) => persona.id !== selectedPersonaId)]
    : personas;
  const firstCommandValue = selectedPersona
    ? `${orderedPersonas[0].label} ${orderedPersonas[0].description} ${orderedPersonas[0].id}`
    : 'all play styles';

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setActiveCommandValue('');

    setOpen(nextOpen);
  };

  const selectPersona = (personaId: string) => {
    onSelect(personaId);
    setOpen(false);
  };

  const allPlayStylesItem = (
    <CommandItem
      value="all play styles"
      onSelect={() => selectPersona('')}
      showCheck={false}
      className="persona-command-item min-h-[76px] rounded-none! border-b border-border/50 px-4 py-3 last:border-b-0 aria-selected:bg-accent aria-selected:text-accent-foreground in-data-[slot=dialog-content]:rounded-none!"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Sparkles size={17} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span>All play styles</span>
        <span className="text-xs text-muted-foreground">
          Balanced discovery without a selected persona
        </span>
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center" aria-hidden="true">
        {!selectedPersona && <Check className="size-4 text-primary" />}
      </span>
    </CommandItem>
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="size-11 rounded-full border-border bg-card p-0 hover:border-ring/70 hover:bg-secondary"
              aria-label={
                selectedPersona
                  ? `Play style: ${selectedPersona.label}. Change play style`
                  : 'Choose a play style'
              }
              aria-haspopup="dialog"
              aria-keyshortcuts="P"
              aria-expanded={open}
              onClick={() => handleOpenChange(true)}
            />
          }
        >
          {selectedPersona ? (
            <Avatar className="size-9 border-0 after:hidden">
              <AvatarImage src={getPersonaAvatarUrl(selectedPersona.id)} alt="" />
              <AvatarFallback>{selectedPersona.label.slice(0, 1)}</AvatarFallback>
            </Avatar>
          ) : (
            <Sparkles size={19} aria-hidden="true" />
          )}
        </TooltipTrigger>
        <TooltipContent>
          {selectedPersona ? selectedPersona.label : 'All play styles'} · P
        </TooltipContent>
      </Tooltip>

      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Choose a play style"
        description="Search and select a persona to personalize discovery."
        className="max-w-md"
      >
        <Command
          value={activeCommandValue}
          onValueChange={setActiveCommandValue}
          className="rounded-4xl"
        >
          <CommandInput
            className="!text-base md:text-sm"
            placeholder="Search play styles..."
            onKeyDownCapture={(event) => {
              if (event.key !== 'ArrowDown' || activeCommandValue) return;

              // Select the first option before cmdk handles the key, then prevent
              // cmdk from advancing to the second option in the same event.
              event.preventDefault();
              event.stopPropagation();
              setActiveCommandValue(firstCommandValue);
            }}
          />
          <CommandList
            className="touch-pan-y overscroll-contain"
            onTouchStartCapture={() => {
              const input = document.querySelector<HTMLInputElement>('[data-slot="command-input"]');

              if (input && document.activeElement === input) input.blur();
            }}
            onTouchMoveCapture={() => {
              const input = document.querySelector<HTMLInputElement>('[data-slot="command-input"]');

              if (input && document.activeElement === input) input.blur();
            }}
          >
            <CommandEmpty>No play styles found.</CommandEmpty>
            <CommandGroup heading="Play styles">
              {!selectedPersona && allPlayStylesItem}
              {orderedPersonas.map((persona) => {
                const selected = persona.id === selectedPersonaId;

                return (
                  <Fragment key={persona.id}>
                    <CommandItem
                      value={`${persona.label} ${persona.description} ${persona.id}`}
                      onSelect={() => selectPersona(persona.id)}
                      showCheck={false}
                      className="persona-command-item min-h-[76px] rounded-none! border-b border-border/50 px-4 py-3 last:border-b-0 aria-selected:bg-accent aria-selected:text-accent-foreground in-data-[slot=dialog-content]:rounded-none!"
                    >
                      <Avatar className="size-9 shrink-0 border-0 after:hidden">
                        <AvatarImage src={getPersonaAvatarUrl(persona.id)} alt="" />
                        <AvatarFallback>{persona.label.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span>{persona.label}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {persona.description}
                        </span>
                      </span>
                      <span
                        className="flex size-8 shrink-0 items-center justify-center"
                        aria-hidden="true"
                      >
                        {selected && <Check className="size-4 text-primary" />}
                      </span>
                    </CommandItem>
                    {selected && allPlayStylesItem}
                  </Fragment>
                );
              })}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <div className="flex items-start gap-2 border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
            <p>Your selected play style is saved on this device and used across discovery.</p>
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}
