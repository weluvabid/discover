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
  { value: 'Action RPG', label: 'Action & RPG' },
  { value: 'Exploration', label: 'Exploration' },
  { value: 'Co-op', label: 'Survival & Co-op' },
  { value: 'Racing', label: 'Racing' },
  { value: 'Horror', label: 'Psychological Horror' },
  { value: 'Simulation', label: 'Simulation & Sandbox' },
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
  activePlayers?: number;
  /** Positive-vote percentage; absent when Roblox exposes no vote data. */
  rating?: number;
  /** Retained for legacy catalog compatibility; live Roblox data uses voteCount. */
  reviewCount?: number;
  voteCount?: number;
  averagePlaytimeMinutes?: number;
  visits?: number;
  favorites?: number;
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
  /** Confidence in the live provider's inferred genre; low/unknown values are excluded from genre similarity. */
  genreConfidence?: 'high' | 'medium' | 'low' | 'unknown';
  subgenre: string;
  artwork: ExperienceArtwork;
  metrics: ExperienceMetrics;
  publishedAt?: string;
  updatedAt?: string;
  freshnessReferenceAt?: string;
  tags: string[];
  discoveryReason?: string;
  matchScore?: number;
  /** Persona-specific topical relevance, independent of genre affinity. */
  personaRelevanceScore?: number;
  isFeatured?: boolean;
  /** Original position and feed identity before Discover re-ranking. */
  source?: {
    provider: 'rotunnel' | 'catalog';
    sortId: string;
    nativePosition: number;
  };
}

export type DiscoveryView = 'explore' | 'search' | 'trending' | 'hidden-gems' | 'collections' | 'library';

export interface DiscoveryPersona {
  id: string;
  label: string;
  description: string;
  preferences: ExperienceGenre[];
}
