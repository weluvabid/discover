import { Bookmark, Compass, Gem, Layers3, Search, TrendingUp } from 'lucide-react';
import {
  GENRE_FILTER_OPTIONS,
  type DiscoveryView,
  type ExperienceGenre,
} from '@/types/experience';
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
  { id: 'search', label: 'Search', icon: Search },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'hidden-gems', label: 'Hidden Gems', icon: Gem },
  { id: 'collections', label: 'Collections', icon: Layers3 },
  { id: 'library', label: 'Library', icon: Bookmark },
] as const;

interface SidebarProps {
  activeView: DiscoveryView;
  selectedGenre: ExperienceGenre | 'All';
  onSelectGenre: (genre: ExperienceGenre | 'All') => void;
  genreCounts: Record<string, number>;
}

function getGenrePath(genre: ExperienceGenre | 'All') {
  return genre === 'All' ? '/' : `/genre/${genre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function getNavigationPath(view: DiscoveryView, genre: ExperienceGenre | 'All') {
  if (view === 'explore' && genre !== 'All') return getGenrePath(genre);
  return view === 'explore' ? '/' : `/${view}`;
}

export function Sidebar({
  activeView,
  selectedGenre,
  onSelectGenre,
  genreCounts,
}: SidebarProps) {
  const { isMobile, setOpenMobile, state } = useSidebar();

  return (
    <ReUISidebar
      id="discover-navigation"
      collapsible="icon"
      mobileSide="right"
      className="bg-sidebar text-sidebar-foreground"
    >
      <SidebarHeader className="min-h-16 justify-center px-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        <Brand compact={state === 'collapsed' && !isMobile} />
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
                        aria-label={label}
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
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>BROWSE GENRES</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {GENRE_FILTER_OPTIONS.map(({ value, label }) => (
                <SidebarMenuItem key={value}>
                  <SidebarMenuButton
                    isActive={selectedGenre === value}
                    tooltip={label}
                    render={
                      <a
                        href={getGenrePath(value)}
                        aria-current={
                          selectedGenre === value && value !== 'All' ? 'page' : undefined
                        }
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
                          onSelectGenre(value);

                          if (isMobile) setOpenMobile(false);
                        }}
                      />
                    }
                  >
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {typeof genreCounts[value] === 'number' && (
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {genreCounts[value].toLocaleString('en')}
                      </span>
                    )}
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
