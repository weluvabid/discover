import { experiences } from './experiences';
import type { Experience } from '@/types/experience';

export function getMockExperience(id: string): Experience {
  const experience = experiences.find((item) => item.id === id);

  if (!experience) {
    throw new Error(`Missing mock experience: ${id}`);
  }

  return experience;
}

export const featuredExperience = getMockExperience('deep-descent');
export const trendingExperiences = [
  'vanguard-cyber-drift',
  'elden-realm',
  'kinetic-overdrive',
  'orbit-mechanics',
].map(getMockExperience);
export const recommendedExperiences = [
  'pinecrest-deep-wilds',
  'threshold-corridor',
  'clockwork-citadel',
].map(getMockExperience);
export const hiddenGemExperiences = ['liminal-protocols', 'whispers-taiga', 'broadside-1944'].map(
  getMockExperience,
);
export const recentlyLaunchedExperiences = [
  'singularity-genesis',
  'astro-colony-alpha',
  'neo-horizon-circuit',
  'astral-blades',
].map(getMockExperience);
