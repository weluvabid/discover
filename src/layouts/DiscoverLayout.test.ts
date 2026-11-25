/* @vitest-environment node */
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

  it('serves branding assets from stable public URLs', () => {
    const brand = readFileSync(new URL('../components/layout/Brand.tsx', import.meta.url), 'utf8');

    expect(brand).toContain('src="/brand/mark.svg"');
    expect(brand).not.toMatch(/import\s+\w+\s+from\s+['"].*\.svg/);
    expect(layout).toContain('href="/favicon/favicon.svg"');
    expect(layout).not.toMatch(/import\s+faviconUrl\s+from/);
  });

  it('keeps the Safari body-scrolling contract while enabling page transitions', () => {
    expect(layout).toContain("import { ClientRouter } from 'astro:transitions';");
    expect(layout).toContain("import 'sonner/dist/styles.css';");
    expect(layout).toContain('<ClientRouter />');
  });
});
