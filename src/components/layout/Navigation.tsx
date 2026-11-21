import { Bookmark, Compass, Gem, Layers3, TrendingUp, type LucideIcon } from 'lucide-react';
import type { DiscoveryView, ExperienceGenre } from '@/types/experience';
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
  onNavigate: (view: DiscoveryView) => void;
}

interface SidebarProps extends NavigationProps {
  selectedGenre: ExperienceGenre | 'All';
  onSelectGenre: (genre: ExperienceGenre | 'All') => void;
}

export function Sidebar({ activeView, onNavigate, selectedGenre, onSelectGenre }: SidebarProps) {
  return (
    <aside className="sidebar">
      <Brand />
      <nav className="side-nav" aria-label="Main navigation">
        <span className="nav-label">DISCOVER</span>
        {navigationItems.map(({ id, label, icon: Icon }) => (
          <button
            className={`nav-item ${activeView === id ? 'is-active' : ''}`}
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={activeView === id ? 'page' : undefined}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
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
          <button
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
          </button>
        ))}
      </div>
    </aside>
  );
}

export function MobileNavigation({ activeView, onNavigate }: NavigationProps) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navigationItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`mobile-nav-item ${activeView === id ? 'is-active' : ''}`}
          onClick={() => onNavigate(id)}
          aria-current={activeView === id ? 'page' : undefined}
        >
          <Icon size={21} strokeWidth={activeView === id ? 2.4 : 1.9} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
