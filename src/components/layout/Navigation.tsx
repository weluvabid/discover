import { Bookmark, Compass, Gem, Layers3, TrendingUp, type LucideIcon } from 'lucide-react';
import type { DiscoveryView, ExperienceGenre } from '@/types/experience';
import { navigateTo } from '@/hooks/use-browser-location';
import { Button } from '@/components/ui/button';
import { Brand } from './Brand';

interface NavigationItem {
  id: DiscoveryView;
  label: string;
  icon: LucideIcon;
}

const navigationItems: NavigationItem[] = [
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'hidden-gems', label: 'Hidden Gems', icon: Gem },
  { id: 'collections', label: 'Collections', icon: Layers3 },
  { id: 'library', label: 'Library', icon: Bookmark },
];

interface NavigationProps {
  activeView: DiscoveryView;
  selectedGenre: ExperienceGenre | 'All';
}

interface SidebarProps extends NavigationProps {
  onSelectGenre: (genre: ExperienceGenre | 'All') => void;
}

function getNavigationPath(view: DiscoveryView, genre: ExperienceGenre | 'All') {
  const path = view === 'explore' ? '/' : `/${view}`;

  return genre === 'All' ? path : `${path}?genre=${encodeURIComponent(genre)}`;
}

export function Sidebar({ activeView, selectedGenre, onSelectGenre }: SidebarProps) {
  return (
    <aside className="sidebar">
      <Brand />
      <nav className="side-nav" aria-label="Main navigation">
        <span className="nav-label">DISCOVER</span>
        {navigationItems.map(({ id, label, icon: Icon }) => (
          <a
            className={`nav-item ${activeView === id ? 'is-active' : ''}`}
            key={id}
            href={getNavigationPath(id, selectedGenre)}
            aria-current={activeView === id ? 'page' : undefined}
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;

              event.preventDefault();
              navigateTo(getNavigationPath(id, selectedGenre));
            }}
          >
            <Icon size={17} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="sidebar-divider" />
      <div className="genre-nav">
        <span className="nav-label">BROWSE GENRES</span>
        {(
          [
            ['Action RPG', '1.4k'],
            ['Horror', '680'],
            ['Simulation', '920'],
            ['Co-op', '540'],
          ] as const
        ).map(([genre, count]) => (
          <Button
            variant="ghost"
            size="sm"
            className={`genre-link ${selectedGenre === genre ? 'is-selected' : ''}`}
            key={genre}
            onClick={() => onSelectGenre(genre)}
          >
            {genre === 'Action RPG'
              ? 'Action & RPG'
              : genre === 'Simulation'
                ? 'Simulation & Sandbox'
                : genre === 'Co-op'
                  ? 'Survival & Co-op'
                  : 'Psychological Horror'}
            <small>{count}</small>
          </Button>
        ))}
      </div>
    </aside>
  );
}

export function MobileNavigation({ activeView, selectedGenre }: NavigationProps) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navigationItems.map(({ id, label, icon: Icon }) => (
        <a
          key={id}
          href={getNavigationPath(id, selectedGenre)}
          className={`mobile-nav-item ${activeView === id ? 'is-active' : ''}`}
          aria-current={activeView === id ? 'page' : undefined}
          onClick={(event) => {
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;

            event.preventDefault();
            navigateTo(getNavigationPath(id, selectedGenre));
          }}
        >
          <Icon size={21} strokeWidth={activeView === id ? 2.4 : 1.9} />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
