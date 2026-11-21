import { describe, expect, it } from 'vitest';
import { getPersonaAvatarUrl } from './persona-avatar';

describe('getPersonaAvatarUrl', () => {
  it('uses a stable, encoded persona seed', () => {
    expect(getPersonaAvatarUrl('creative builder')).toContain('seed=creative%20builder');
    expect(getPersonaAvatarUrl('builder')).toBe(getPersonaAvatarUrl('builder'));
  });
});
