import { Sparkles } from 'lucide-react';
import { ExperienceCard } from '@/components/experience/ExperienceCard';
import type { Experience } from '@/types/experience';
import { PageIntro } from './PageIntro';

interface CollectionsViewProps {
  experiences: Experience[];
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onPlay: (experience: Experience) => void;
}

const collectionDefinitions = [
  {
    title: 'Into the Unknown',
    description: 'Atmospheric worlds made for curious explorers.',
    genre: 'Exploration',
  },
  {
    title: 'Play Together',
    description: 'Bring your crew. These worlds are better together.',
    genre: 'Co-op',
  },
  {
    title: 'Think Different',
    description: 'Unusual mechanics and clever worlds worth exploring.',
    genre: 'Puzzle',
  },
] as const;

export function CollectionsView({
  experiences,
  bookmarks,
  onToggleBookmark,
  onPlay,
}: CollectionsViewProps) {
  return (
    <div className="min-w-0">
      <PageIntro
        eyebrow="CURATED WORLDS"
        title="Collections"
        description="A few good places to start, picked by the Discover team."
        icon={<Sparkles size={17} />}
      />
      {collectionDefinitions.map((collection) => {
        const items = experiences
          .filter((experience) => experience.genre === collection.genre)
          .slice(0, 3);

        return (
          <section className="mt-8 space-y-4" key={collection.title}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{collection.title}</h2>
                <p className="text-sm text-muted-foreground">{collection.description}</p>
              </div>
              <span className="text-xs text-muted-foreground">{items.length} experiences</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((experience) => (
                <ExperienceCard
                  key={experience.id}
                  experience={experience}
                  variant="recommended"
                  isBookmarked={bookmarks.includes(experience.id)}
                  onToggleBookmark={onToggleBookmark}
                  onPlay={onPlay}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
