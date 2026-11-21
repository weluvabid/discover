import { describe, expect, it } from 'vitest';
import { formatSignedPercent } from './utils';

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
