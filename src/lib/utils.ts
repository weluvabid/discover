import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatSignedPercent(value: number): string {
  if (!Number.isFinite(value)) return '0.0%';

  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}
