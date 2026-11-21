import { Compass } from 'lucide-react';
import { ExperienceSection } from '@/components/discovery/ExperienceSection';
import type { Experience } from '@/types/experience';
import { PageIntro } from './PageIntro';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SearchSort } from '@/lib/api/discover-api';

const SORT_LABELS: Record<SearchSort, string> = {
  relevance: 'Relevance',
  players: 'Most players',
  rating: 'Highest rated',
  reviews: 'Most reviewed',
  launched: 'Recently launched',
  updated: 'Recently updated',
};

interface SearchResultsViewProps {
  query: string;
  results: Experience[];
  sort: SearchSort;
  onSortChange: (sort: SearchSort) => void;
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onPlay: (experience: Experience) => void;
  loading: boolean;
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
}: SearchResultsViewProps) {
  return (
    <div className="min-w-0">
      <PageIntro
        eyebrow="DISCOVERY SEARCH"
        title={
          <>
            Search results{' '}
            <span
              aria-live="polite"
              className="mt-2 block text-base font-medium text-muted-foreground sm:ml-3 sm:mt-0 sm:inline sm:text-sm"
            >
              <span className="hidden sm:inline">· </span>
              {loading
                ? 'Searching…'
                : results.length === 100
                  ? 'Top 100 matches'
                  : `${results.length} matching experiences`}
            </span>
          </>
        }
        description={`Showing matches for “${query}”.`}
        icon={<Compass size={17} />}
      />
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <Select value={sort} onValueChange={(value) => onSortChange(value as SearchSort)}>
          <SelectTrigger aria-label="Sort search results" className="w-48">
            <SelectValue>{SORT_LABELS[sort]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="players">Most players</SelectItem>
            <SelectItem value="rating">Highest rated</SelectItem>
            <SelectItem value="reviews">Most reviewed</SelectItem>
            <SelectItem value="launched">Recently launched</SelectItem>
            <SelectItem value="updated">Recently updated</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ExperienceSection
        title="Search results"
        experiences={results}
        variant="recommended"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onPlay={onPlay}
        emptyTitle="No matching experiences"
        emptyMessage="Try another title, creator or genre."
        loading={loading}
        hideHeader
      />
    </div>
  );
}
