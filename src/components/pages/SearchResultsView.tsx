import { Compass } from 'lucide-react';
import { ExperienceSection } from '@/components/discovery/ExperienceSection';
import type { Experience } from '@/types/experience';
import { PageIntro } from './PageIntro';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SearchSort } from '@/lib/api/discover-api';

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
        title="Search results"
        description={`Showing matches for “${query}”.`}
        icon={<Compass size={17} />}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{loading ? "Searching experiences…" : results.length === 100 ? "Top 100 matches" : `${results.length} matching experiences`}</p>
        <Select value={sort} onValueChange={(value) => onSortChange(value as SearchSort)}>
          <SelectTrigger aria-label="Sort search results" className="w-48">
            <SelectValue placeholder="Sort by" />
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
      />
    </div>
  );
}
