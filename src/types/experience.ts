export const EXPERIENCE_GENRES = [
  'Action RPG',
  'Exploration',
  'Co-op',
  'Racing',
  'Horror',
  'Simulation',
  'Puzzle',
] as const;

export type ExperienceGenre = (typeof EXPERIENCE_GENRES)[number];

export const GENRE_OPTIONS: ReadonlyArray<{
  value: ExperienceGenre;
  label: string;
  count?: string;
}> = [
  { value: 'Action RPG', label: 'Action & RPG', count: '1.4k' },
  { value: 'Exploration', label: 'Exploration' },
  { value: 'Co-op', label: 'Survival & Co-op', count: '540' },
  { value: 'Racing', label: 'Racing' },
  { value: 'Horror', label: 'Psychological Horror', count: '680' },
  { value: 'Simulation', label: 'Simulation & Sandbox', count: '920' },
  { value: 'Puzzle', label: 'Puzzle' },
];

export const GENRE_FILTER_OPTIONS: ReadonlyArray<{
  value: ExperienceGenre | 'All';
  label: string;
  count?: string;
}> = [{ value: 'All', label: 'All' }, ...GENRE_OPTIONS];

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
  /** Deterministic simulated metrics; these are not Roblox telemetry. */
  averageSessionMinutes?: number;
  d1Retention?: number;
  d7Retention?: number;
  d30Retention?: number;
  repeatPlayRate?: number;
}

export interface Experience {
  id: string;
  /** HTTPS Roblox experience URL used by the Play action when available. */
  robloxUrl?: string;
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
