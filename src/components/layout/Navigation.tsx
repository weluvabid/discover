import { Bookmark, Compass, Gem, Layers3, TrendingUp } from 'lucide-react';
import type { DiscoveryView, ExperienceGenre } from '@/types/experience';
import { navigateTo } from '@/hooks/use-browser-location';
import { Brand } from './Brand';
import {
  Sidebar as ReUISidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';

const navigationItems = [
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'hidden-gems', label: 'Hidden Gems', icon: Gem },
  { id: 'collections', label: 'Collections', icon: Layers3 },
  { id: 'library', label: 'Library', icon: Bookmark },
] as const;

const genreItems = [
  { id: 'Action RPG', label: 'Action & RPG', count: '1.4k' },
  { id: 'Horror', label: 'Psychological Horror', count: '680' },
  { id: 'Simulation', label: 'Simulation & Sandbox', count: '920' },
  { id: 'Co-op', label: 'Survival & Co-op', count: '540' },
] as const;

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
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <ReUISidebar collapsible="icon" className="discover-sidebar">
      <SidebarHeader className="discover-sidebar-header">
        <Brand />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>DISCOVER</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map(({ id, label, icon: Icon }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    render={
                      <a
                        href={getNavigationPath(id, selectedGenre)}
                        aria-current={activeView === id ? 'page' : undefined}
                        onClick={(event) => {
                          if (
                            event.button !== 0 ||
                            event.metaKey ||
                            event.ctrlKey ||
                            event.shiftKey ||
                            event.altKey
                          ) return;
                          event.preventDefault();
                          navigateTo(getNavigationPath(id, selectedGenre));
                          if (isMobile) setOpenMobile(false);
                        }}
                      />
                    }
                    isActive={activeView === id}
                    tooltip={label}
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="mx-3 w-auto" />
        <SidebarGroup>
          <SidebarGroupLabel>BROWSE GENRES</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {genreItems.map(({ id, label, count }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    isActive={selectedGenre === id}
                    tooltip={label}
                    onClick={() => {
                      onSelectGenre(id);
                      if (isMobile) setOpenMobile(false);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <span className="discover-genre-count">{count}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </ReUISidebar>
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
            ) return;
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
