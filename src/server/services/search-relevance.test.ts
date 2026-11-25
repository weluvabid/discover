import { describe, expect, it } from 'vitest';
import { scoreSearchRelevance } from './search-relevance';
import type { Experience } from '../../types/experience';

const experience = (title: string, creator = 'Studio'): Experience => ({
  id: '123',
  title,
  creator,
  description: 'An adventure experience.',
  genre: 'Puzzle',
  subgenre: 'Puzzle',
  tags: ['Puzzle', 'Escape'],
  artwork: { thumbnail: '', alt: title },
  metrics: {},
});

describe('search relevance', () => {
  it('prioritizes exact and prefix title matches', () => {
    expect(scoreSearchRelevance(experience('Evade'), 'evade')).toBe(1);
    expect(scoreSearchRelevance(experience('Evade 2'), 'evade')).toBe(0.96);
    expect(scoreSearchRelevance(experience('Escape Evade'), 'evade')).toBe(0.9);
  });

  it('uses creator and metadata matches without rewarding unrelated descriptions heavily', () => {
    expect(scoreSearchRelevance(experience('Other', 'Evade Studio'), 'evade')).toBe(0.8);
    expect(scoreSearchRelevance(experience('Other'), 'unrelated')).toBe(0);
  });
});
