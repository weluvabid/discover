import { Compass } from 'lucide-react';
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
import type { RankedExperience } from '@/features/discovery/engine/ranking';
import { SEARCH_SORT_LABELS } from '@/config/discovery';
import { GENRE_FILTER_OPTIONS } from '@/types/experience';

const SORT_LABELS: Record<SearchSort, string> = SEARCH_SORT_LABELS;

interface SearchResultsViewProps {
  query: string;
  results: Experience[];
  rankingById: Map<string, RankedExperience>;
  sort: SearchSort;
  onSortChange: (sort: SearchSort) => void;
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onPlay: (experience: Experience) => void;
  loading: boolean;
  genre: ExperienceGenre | 'All';
  onGenreChange: (genre: ExperienceGenre | 'All') => void;
}

export function SearchResultsView({
  query,
  results,
  rankingById,
  sort,
  onSortChange,
  bookmarks,
  onToggleBookmark,
  onPlay,
  loading,
  genre,
  onGenreChange,
}: SearchResultsViewProps) {
  return (
    <div className="min-w-0">
      <PageIntro
        eyebrow="DISCOVERY SEARCH"
        title={query.trim() ? 'Search results' : 'Search experiences'}
        description={
          query.trim()
            ? `Showing matches for “${query}”.`
            : 'Find Roblox experiences by name or creator.'
        }
        icon={<Compass size={17} />}
      />
      <div className="mb-5 grid min-w-0 grid-cols-1 gap-3 border-b border-border pb-4 sm:grid-cols-2">
        <Select
          value={genre}
          onValueChange={(value) => onGenreChange(value as ExperienceGenre | 'All')}
        >
          <SelectTrigger aria-label="Filter search results by genre" className="w-full">
            <SelectValue>
              {GENRE_FILTER_OPTIONS.find((option) => option.value === genre)?.label ?? 'All genres'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            {GENRE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => onSortChange(value as SearchSort)}>
          <SelectTrigger aria-label="Sort search results" className="w-full">
            <SelectValue>{SORT_LABELS[sort]}</SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="players">Most players</SelectItem>
            <SelectItem value="rating">Highest rated</SelectItem>
            <SelectItem value="reviews">Most votes</SelectItem>
            <SelectItem value="launched">Recently launched</SelectItem>
            <SelectItem value="updated">Recently updated</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ExperienceSection
        title="Search results"
        experiences={results}
        rankingById={rankingById}
        rankingLabel="SEARCH RANK SCORE"
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
