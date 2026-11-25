import { Menu, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Brand } from './Brand';
import { PersonaCommandSelector } from '@/components/discovery/PersonaCommandSelector';
import type { DiscoveryPersona } from '@/types/experience';

interface HeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  resultCount: number;
  onOpenDiscoveryControls: () => void;
  hasCustomRanking: boolean;
  personas: DiscoveryPersona[];
  persona: string;
  onPersonaChange: (persona: string) => void;
}

export function Header({
  query,
  onQueryChange,
  resultCount,
  onOpenDiscoveryControls,
  hasCustomRanking,
  personas,
  persona,
  onPersonaChange,
}: HeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isMobile, openMobile, toggleSidebar } = useSidebar();

  useEffect(() => {
    const isTextEntryTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;

      return Boolean(
        target.isContentEditable ||
          target.closest(
            'input, textarea, select, [contenteditable="true"], [role="textbox"]',
          ),
      );
    };

    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // Single-letter shortcuts avoid browser-reserved Alt combinations. Never
      // intercept keystrokes while a user is entering text or using modifiers.
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        isTextEntryTarget(event.target)
      ) {
        return;
      }

      if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        window.dispatchEvent(new Event('discover:open-persona-selector'));
        return;
      }

      if (event.key.toLowerCase() === 't') {
        event.preventDefault();
        onOpenDiscoveryControls();
      }
    };

    window.addEventListener('keydown', handleShortcut);

    return () => window.removeEventListener('keydown', handleShortcut);
  }, [onOpenDiscoveryControls]);

  return (
    <div className="sticky top-0 z-40 border-b border-border/80 bg-background/90 px-4 py-3 backdrop-blur-xl md:flex md:items-center md:gap-4 md:px-6">
      <header className="flex min-h-10 items-center justify-between gap-3 md:contents">
        <SidebarTrigger className="hidden md:inline-flex" aria-label="Toggle navigation sidebar (Ctrl/Command + B)" aria-keyshortcuts="Control+B Meta+B" title="Toggle sidebar · Ctrl/Command + B" />
        <div className="md:hidden">
          <Brand compact />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <PersonaCommandSelector
            personas={personas}
            selectedPersonaId={persona}
            onSelect={onPersonaChange}
          />
          <Button
            id="tune-discovery-trigger"
            variant="outline"
            size="default"
            onClick={onOpenDiscoveryControls}
            aria-label="Tune discovery preferences"
            title="Tune discovery · T"
            aria-keyshortcuts="T"
            className="tune-discovery-glow relative gap-2"
          >
            <Sparkles aria-hidden="true" />
            <span>Tune discovery</span>
            {hasCustomRanking && (
              <span className="absolute right-1 top-1 size-1.5 rounded-full bg-foreground" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={toggleSidebar}
            aria-label="Open navigation menu (Ctrl/Command + B)"
            aria-keyshortcuts="Control+B Meta+B"
            title="Toggle sidebar · Ctrl/Command + B"
            aria-expanded={isMobile ? openMobile : undefined}
          >
            <Menu />
          </Button>
        </div>
      </header>
      <label className="mt-3 flex h-11 w-full min-w-0 items-center gap-3 rounded-xl border border-input bg-card px-3 text-muted-foreground focus-within:border-ring md:mt-0 md:max-w-xl">
        <Search size={18} aria-hidden="true" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search experiences, creators, and tags..."
          aria-label="Search experiences, creators, and tags"
          aria-keyshortcuts="Control+K Meta+K"
          className="h-full min-h-0 border-0 bg-transparent px-0 text-sm shadow-none placeholder:text-sm focus-visible:ring-0"
        />
        {query.trim() && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-7 shrink-0 text-muted-foreground"
            onClick={() => {
              onQueryChange('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            title="Clear search"
          >
            <X size={15} aria-hidden="true" />
          </Button>
        )}
        <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground md:inline">
          ⌘ K
        </kbd>
        {query.trim() && resultCount >= 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">{resultCount} results</span>
        )}
      </label>
    </div>
  );
}
