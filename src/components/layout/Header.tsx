import { Menu, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Brand } from './Brand';

interface HeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  resultCount: number;
  onOpenDiscoveryControls: () => void;
  hasCustomRanking: boolean;
}

export function Header({
  query,
  onQueryChange,
  resultCount,
  onOpenDiscoveryControls,
  hasCustomRanking,
}: HeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isMobile, openMobile, toggleSidebar } = useSidebar();

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  return (
    <div className="header-shell">
      <header className="topbar">
        <SidebarTrigger className="discover-sidebar-trigger desktop-sidebar-trigger" />
        <div className="mobile-brand">
          <Brand compact />
        </div>
        <div className="header-actions">
          <Button
            id="tune-discovery-trigger"
            variant="outline"
            className={`discovery-controls-trigger ${hasCustomRanking ? 'has-custom-ranking' : ''}`}
            onClick={onOpenDiscoveryControls}
            aria-label="Tune discovery preferences"
            title="Tune discovery"
          >
            <SlidersHorizontal size={18} />
            <span className="discovery-controls-label">
              {hasCustomRanking ? 'Custom ranking' : 'Tune discovery'}
            </span>
            {hasCustomRanking && <i />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="mobile-menu-trigger"
            onClick={toggleSidebar}
            aria-label="Open navigation menu"
            aria-expanded={isMobile ? openMobile : undefined}
          >
            <Menu size={21} />
          </Button>
        </div>
      </header>
      <label className="search-field">
        <Search size={18} aria-hidden="true" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search experiences, creators, and tags..."
          aria-label="Search experiences, creators, and tags"
          className="header-search-input h-full min-h-0 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0"
        />
        <kbd>⌘ K</kbd>
        {query && <span className="search-count">{resultCount} results</span>}
      </label>
    </div>
  );
}
