import { experiences } from './experiences';
import type { Experience } from '@/types/experience';

export function getMockExperience(id: string): Experience {
  const experience = experiences.find((item) => item.id === id);
  if (!experience) throw new Error(`Missing mock experience: ${id}`);
  return experience;
}
