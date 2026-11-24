import { Compass, X } from 'lucide-react';
import { ExperienceSection } from '@/components/discovery/ExperienceSection';
import type { Experience, ExperienceGenre } from '@/types/experience';
import { PageIntro } from './PageIntro';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SearchSort } from '@/lib/api/discover-api';
import { SEARCH_SORT_LABELS } from '@/config/discovery';
import { GenreFilters } from '@/components/discovery/GenreFilters';
import { Button } from '@/components/ui/button';

const SORT_LABELS: Record<SearchSort, string> = SEARCH_SORT_LABELS;

interface SearchResultsViewProps {
  query: string;
  results: Experience[];
  sort: SearchSort;
  onSortChange: (sort: SearchSort) => void;
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onPlay: (experience: Experience) => void;
  loading: boolean;
  genre: ExperienceGenre | 'All';
  onGenreChange: (genre: ExperienceGenre | 'All') => void;
  onClearQuery: () => void;
}

export function SearchResultsView({
  query,
  results,
  sort,
  onSortChange,
  bookmarks,
  onToggleBookmark,
  onPlay,
  loading,
  genre,
  onGenreChange,
  onClearQuery,
}: SearchResultsViewProps) {
  return (
    <div className="min-w-0">
      <PageIntro
        eyebrow="DISCOVERY SEARCH"
        title={
          <>
            {query.trim() ? 'Search results' : 'Search experiences'}{' '}
            <span
              aria-live="polite"
              className="mt-2 block text-base font-medium text-muted-foreground sm:ml-3 sm:mt-0 sm:inline sm:text-sm"
            >
              <span className="hidden sm:inline">· </span>
              {!query.trim()
                ? 'Enter a search above'
                : loading
                  ? 'Searching…'
                  : results.length === 100
                    ? 'Top 100 matches'
                    : `${results.length} matching experiences`}
            </span>
          </>
        }
        description={
          query.trim()
            ? `Showing matches for “${query}”.`
            : 'Find Roblox experiences by name or creator.'
        }
        icon={<Compass size={17} />}
      />
      <div className="mb-5 flex min-w-0 flex-col gap-4 border-b border-border pb-4">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 overflow-hidden">
            <GenreFilters selected={genre} onSelect={onGenreChange} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Select value={sort} onValueChange={(value) => onSortChange(value as SearchSort)}>
              <SelectTrigger aria-label="Sort search results" className="w-48">
                <SelectValue>{SORT_LABELS[sort]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="players">Most players</SelectItem>
                <SelectItem value="rating">Highest rated</SelectItem>
                <SelectItem value="reviews">Most votes</SelectItem>
                <SelectItem value="launched">Recently launched</SelectItem>
                <SelectItem value="updated">Recently updated</SelectItem>
              </SelectContent>
            </Select>
            {query.trim() && (
              <Button variant="ghost" size="icon" onClick={onClearQuery} aria-label="Clear search">
                <X size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
      <ExperienceSection
        title="Search results"
        experiences={results}
        variant="recommended"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onPlay={onPlay}
        emptyTitle={query.trim() ? 'No matching experiences' : 'Start with a search'}
        emptyMessage={
          query.trim()
            ? 'Try another title, creator or genre.'
            : 'Use the search field above to find experiences by name or creator.'
        }
        loading={loading}
        hideHeader
      />
    </div>
  );
}
