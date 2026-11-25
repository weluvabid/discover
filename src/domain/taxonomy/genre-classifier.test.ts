import { describe, expect, it } from 'vitest';
import { classifyGenre } from './genre-classifier';

describe('genre classifier coverage', () => {
  it.each([
    [
      'Survival Island',
      'Gather resources, craft tools and build a shelter to survive the wilderness.',
    ],
    ['Zombie Survival', 'Scavenge for supplies, defend your base and survive waves of zombies.'],
    ['Co-op Survival', 'Work together with friends, gather resources and craft shelter.'],
  ])('classifies explicit survival mechanics: %s', (title, description) => {
    expect(classifyGenre({ title, description }).genre).toBe('Co-op');
    expect(classifyGenre({ title, description }).confidence).toBe('high');
  });

  it.each([
    ['Kart Racing', 'Race other drivers, set lap times and reach the finish line.'],
    ['Street Racing', 'Tune your car and compete in street racing events.'],
    ['Drag Racing Simulator', 'Compete in drag races and beat the clock.'],
  ])('recognizes explicit racing mechanics: %s', (title, description) => {
    expect(classifyGenre({ title, description }).genre).toBe('Racing');
    expect(classifyGenre({ title, description }).confidence).toBe('high');
  });

  it('does not classify a generic use of survive as a survival game', () => {
    const result = classifyGenre({
      title: 'Escape the Haunted School',
      description: 'Survive the night while avoiding the monster.',
    });

    expect(result.genre).toBe('Horror');
    expect(result.confidence).toBe('high');
  });
});
