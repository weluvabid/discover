import { Bookmark, Compass, Gem, Layers3, TrendingUp } from 'lucide-react';
import { GENRE_FILTER_OPTIONS, type DiscoveryView, type ExperienceGenre } from '@/types/experience';
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

interface SidebarProps {
  activeView: DiscoveryView;
  selectedGenre: ExperienceGenre | 'All';
  onSelectGenre: (genre: ExperienceGenre | 'All') => void;
}

function getNavigationPath(view: DiscoveryView, genre: ExperienceGenre | 'All') {
  const path = view === 'explore' ? '/' : `/${view}`;
  return genre === 'All' ? path : `${path}?genre=${encodeURIComponent(genre)}`;
}

export function Sidebar({ activeView, selectedGenre, onSelectGenre }: SidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <ReUISidebar
      id="discover-navigation"
      collapsible="icon"
      mobileSide="right"
      className="bg-sidebar text-sidebar-foreground"
    >
      <SidebarHeader className="min-h-16 justify-center px-3">
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
                          ) {
                            return;
                          }
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
              {GENRE_FILTER_OPTIONS.map(({ value, label, count }) => (
                <SidebarMenuItem key={value}>
                  <SidebarMenuButton
                    isActive={selectedGenre === value}
                    tooltip={label}
                    onClick={() => {
                      onSelectGenre(value);
                      if (isMobile) setOpenMobile(false);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {count && <span className="ml-auto text-xs tabular-nums text-muted-foreground">{count}</span>}
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
