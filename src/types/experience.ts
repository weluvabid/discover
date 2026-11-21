export type ExperienceGenre =
  'Action RPG' | 'Exploration' | 'Co-op' | 'Racing' | 'Horror' | 'Simulation' | 'Puzzle';

export interface ExperienceArtwork {
  thumbnail: string;
  hero?: string;
  alt: string;
}

export interface ExperienceMetrics {
  activePlayers: number;
  rating: number;
  reviewCount: number;
  averagePlaytimeMinutes: number;
  weeklyChange?: number;
}

export interface Experience {
  id: string;
  title: string;
  description: string;
  creator: string;
  creatorVerified?: boolean;
  genre: ExperienceGenre;
  subgenre: string;
  artwork: ExperienceArtwork;
  metrics: ExperienceMetrics;
  publishedAt: string;
  tags: string[];
  discoveryReason?: string;
  matchScore?: number;
  isFeatured?: boolean;
}

export type DiscoveryView = 'explore' | 'trending' | 'hidden-gems' | 'collections' | 'library';
