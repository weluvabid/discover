import { Bell, Bookmark, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Brand } from './Brand';

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
      <div className="mobile-brand">
        <Brand />
      </div>
      <label className="search-field">
        <Search size={17} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search experiences, creators, and tags..."
          aria-label="Search experiences, creators, and tags"
        />
        <kbd>⌘ K</kbd>
        {query && <span className="search-count">{resultCount} results</span>}
      </label>
      <div className="header-actions">
        <button
          className="icon-button mobile-filter"
          onClick={onOpenFilters}
          aria-label="Open filters"
        >
          <SlidersHorizontal size={18} />
        </button>
        <button
          className={`icon-button notification-button ${notificationsOpen ? 'is-active' : ''}`}
          onClick={() => setNotificationsOpen((open) => !open)}
          aria-label="Notifications"
          aria-expanded={notificationsOpen}
        >
          <Bell size={18} />
          <i />
        </button>
        <button
          id="tune-discovery-trigger"
          className={`discovery-controls-trigger ${hasCustomRanking ? 'has-custom-ranking' : ''}`}
          onClick={onOpenDiscoveryControls}
          aria-label="Tune discovery ranking"
          title="Tune discovery"
        >
          <Sparkles size={16} />
          <span>{hasCustomRanking ? 'Custom ranking' : 'Tune discovery'}</span>
          {hasCustomRanking && <i />}
        </button>
        <button
          className="icon-button saved-shortcut"
          onClick={onOpenLibrary}
          aria-label="Saved experiences"
        >
          <Bookmark size={18} />
        </button>
        <button className="avatar-button" aria-label="Vesper account">
          <img src="https://i.pravatar.cc/80?img=12" alt="" />
          <i />
        </button>
        {notificationsOpen && (
          <div className="notification-popover" role="status">
            <strong>You're all caught up</strong>
            <span>New discoveries will show up here.</span>
          </div>
        )}
      </div>
    </header>
  );
}
