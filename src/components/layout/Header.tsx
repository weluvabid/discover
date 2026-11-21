import { Bell, Bookmark, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Brand } from './Brand';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface HeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  resultCount: number;
  onOpenFilters: () => void;
  onOpenLibrary: () => void;
  onOpenDiscoveryControls: () => void;
  hasCustomRanking: boolean;
}

export function Header({
  query,
  onQueryChange,
  resultCount,
  onOpenFilters,
  onOpenLibrary,
  onOpenDiscoveryControls,
  hasCustomRanking,
}: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <header className="topbar">
      <SidebarTrigger className="discover-sidebar-trigger" />
      <div className="mobile-brand">
        <Brand />
      </div>
      <label className="search-field">
        <Search size={17} aria-hidden="true" />
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
      <div className="header-actions">
        <Button
          variant="ghost"
          size="icon"
          className="icon-button mobile-filter"
          onClick={onOpenFilters}
          aria-label="Open filters"
        >
          <SlidersHorizontal size={18} />
        </Button>
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={`icon-button notification-button ${notificationsOpen ? 'is-active' : ''}`}
                aria-label="Notifications"
              />
            }
          >
            <Bell size={18} />
            <i />
          </PopoverTrigger>
          <PopoverContent className="notification-popover" align="end">
            <PopoverHeader>
              <PopoverTitle>You're all caught up</PopoverTitle>
              <PopoverDescription>New discoveries will show up here.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
        <Button
          id="tune-discovery-trigger"
          variant="outline"
          className={`discovery-controls-trigger ${hasCustomRanking ? 'has-custom-ranking' : ''}`}
          onClick={onOpenDiscoveryControls}
          aria-label="Tune discovery ranking"
          title="Tune discovery"
        >
          <Sparkles size={16} />
          <span>{hasCustomRanking ? 'Custom ranking' : 'Tune discovery'}</span>
          {hasCustomRanking && <i />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="icon-button saved-shortcut"
          onClick={onOpenLibrary}
          aria-label="Saved experiences"
        >
          <Bookmark size={18} />
        </Button>
        <div className="avatar-button" role="img" aria-label="Vesper account">
          <img src="https://i.pravatar.cc/80?img=12" alt="" />
          <i />
        </div>
      </div>
    </header>
  );
}
