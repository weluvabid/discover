import { describe, expect, it } from 'vitest';
import { formatSignedPercent, getRankScoreClass } from './utils';

describe('formatSignedPercent', () => {
  it('formats positive values with one leading plus sign', () => {
    expect(formatSignedPercent(8.94)).toBe('+8.9%');
  });

  it('formats negative values with a minus sign and no plus prefix', () => {
    expect(formatSignedPercent(-8.94)).toBe('−8.9%');
  });

  it('formats zero without a sign', () => {
    expect(formatSignedPercent(0)).toBe('0.0%');
  });

  it('normalizes non-finite values', () => {
    expect(formatSignedPercent(Number.NaN)).toBe('0.0%');
  });
});

describe('getRankScoreClass', () => {
  it('uses semantic red, amber, and green score bands', () => {
    expect(getRankScoreClass(59.9)).toBe('text-rose-500');
    expect(getRankScoreClass(60)).toBe('text-amber-500');
    expect(getRankScoreClass(79.9)).toBe('text-amber-500');
    expect(getRankScoreClass(80)).toBe('text-emerald-500');
  });

  it('falls back for non-finite scores', () => {
    expect(getRankScoreClass(Number.NaN)).toBe('text-muted-foreground');
  });
});
