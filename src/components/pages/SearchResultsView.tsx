import { Compass } from 'lucide-react';
import { ExperienceSection } from '@/components/discovery/ExperienceSection';
import type { Experience } from '@/types/experience';
import { PageIntro } from './PageIntro';

interface SearchResultsViewProps {
  query: string;
  results: Experience[];
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onSelect: (experience: Experience) => void;
}

export function SearchResultsView({
  query,
  results,
  bookmarks,
  onToggleBookmark,
  onSelect,
}: SearchResultsViewProps) {
  return (
    <div className="alternate-view search-results-view">
      <PageIntro
        eyebrow="DISCOVERY SEARCH"
        title="Search results"
        description={`Showing matches for “${query}”.`}
        icon={<Compass size={17} />}
      />
      <ExperienceSection
        title={`${results.length} experiences found`}
        experiences={results}
        variant="recommended"
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        onSelect={onSelect}
        emptyTitle="No matching experiences"
        emptyMessage="Try another title, creator or genre."
      />
    </div>
  );
}
