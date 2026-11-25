/* @vitest-environment node */
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { syncBrandAssets } from './sync-brand-assets.mjs';

let temporaryRoot;

afterEach(async () => {
  if (temporaryRoot) {
    await rm(temporaryRoot, { recursive: true, force: true });
    temporaryRoot = undefined;
  }
});

async function createSubmoduleFixture() {
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'discover-brand-assets-'));

  for (const directory of ['brand/brand', 'brand/favicon']) {
    await mkdir(path.join(temporaryRoot, directory), { recursive: true });
  }

  await writeFile(path.join(temporaryRoot, 'brand/brand/mark.svg'), '<svg>mark</svg>');
  await writeFile(path.join(temporaryRoot, 'brand/brand/wordmark.svg'), '<svg>wordmark</svg>');
  await writeFile(path.join(temporaryRoot, 'brand/favicon/favicon.svg'), '<svg>favicon</svg>');
}

describe('brand asset sync', () => {
  it('copies the submodule assets into Astro public URLs', async () => {
    await createSubmoduleFixture();

    await syncBrandAssets(temporaryRoot);

    await expect(
      readFile(path.join(temporaryRoot, 'public/brand/brand/mark.svg'), 'utf8'),
    ).resolves.toBe('<svg>mark</svg>');
    await expect(
      readFile(path.join(temporaryRoot, 'public/brand/brand/wordmark.svg'), 'utf8'),
    ).resolves.toBe('<svg>wordmark</svg>');
    await expect(
      readFile(path.join(temporaryRoot, 'public/brand/favicon/favicon.svg'), 'utf8'),
    ).resolves.toBe('<svg>favicon</svg>');
  });

  it('fails with the submodule initialization command when assets are absent', async () => {
    await createSubmoduleFixture();
    await rm(path.join(temporaryRoot, 'brand/favicon/favicon.svg'));

    await expect(syncBrandAssets(temporaryRoot)).rejects.toThrow(
      'git submodule update --init --recursive',
    );
  });
});
