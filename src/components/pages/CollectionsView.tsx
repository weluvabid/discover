import { Sparkles } from 'lucide-react';
import { ExperienceCard } from '@/components/experience/ExperienceCard';
import { getMockExperience } from '@/data/mocks/catalog';
import type { Experience } from '@/types/experience';
import { PageIntro } from './PageIntro';

interface CollectionsViewProps {
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onSelect: (experience: Experience) => void;
}

const collections = [
  {
    title: 'Into the Unknown',
    description: 'Atmospheric worlds made for curious explorers.',
    ids: ['deep-descent', 'pinecrest-deep-wilds', 'liminal-protocols'],
  },
  {
    title: 'Play Together',
    description: 'Bring your crew. These worlds are better together.',
    ids: ['threshold-corridor', 'vanguard-cyber-drift', 'neon-ronin'],
  },
  {
    title: 'Think Different',
    description: 'Unusual mechanics and clever worlds worth exploring.',
    ids: ['clockwork-citadel', 'orbit-mechanics', 'singularity-genesis'],
  },
] as const;

export function CollectionsView({ bookmarks, onToggleBookmark, onSelect }: CollectionsViewProps) {
  return (
    <div className="alternate-view">
      <PageIntro
        eyebrow="CURATED WORLDS"
        title="Collections"
        description="A few good places to start, picked by the Discover team."
        icon={<Sparkles size={17} />}
      />
      {collections.map((collection) => {
        const items = collection.ids.map(getMockExperience);

        return (
          <section className="collection-block" key={collection.title}>
            <div className="collection-heading">
              <div>
                <h2>{collection.title}</h2>
                <p>{collection.description}</p>
              </div>
              <span>{items.length} experiences</span>
            </div>
            <div className="experience-grid grid-recommended">
              {items.map((experience) => (
                <ExperienceCard
                  key={experience.id}
                  experience={experience}
                  variant="recommended"
                  isBookmarked={bookmarks.includes(experience.id)}
                  onToggleBookmark={onToggleBookmark}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
