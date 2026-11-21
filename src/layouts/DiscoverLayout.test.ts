import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const layout = readFileSync(new URL('./DiscoverLayout.astro', import.meta.url), 'utf8');
const foundation = readFileSync(new URL('../styles/foundation.css', import.meta.url), 'utf8');

describe('shared layout rendering contract', () => {
  it('keeps viewport sizing and vertical scrolling on the body', () => {
    expect(layout).toContain('<html lang="en" class="dark h-full overflow-hidden">');
    expect(layout).toContain('<body class="h-full overflow-y-auto scroll-smooth">');
    expect(foundation).not.toMatch(/html\s*\{[^}]*scroll-behavior/s);
  });

  it('enables Astro client-side page transitions', () => {
    expect(layout).toContain("import { ClientRouter } from 'astro:transitions';");
    expect(layout).toContain('<ClientRouter />');
  });
});
