import { access, cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

async function requireFile(filePath, label, root) {
  try {
    await access(filePath);
  } catch {
    throw new Error(
      `Missing ${label} at ${path.relative(root, filePath)}. ` +
        'Initialise the brand submodule with: git submodule update --init --recursive',
    );
  }
}

/**
 * Publish the checked-out brand submodule under Astro's public directory.
 *
 * The source remains the root-level Git submodule. Only its public assets are
 * mirrored into public/ so Astro can serve them in dev and copy them to dist/.
 */
export async function syncBrandAssets(root = projectRoot) {
  const sourceRoot = path.join(root, 'brand');
  const sourceBrand = path.join(sourceRoot, 'brand');
  const sourceFavicon = path.join(sourceRoot, 'favicon');
  const destinationRoot = path.join(root, 'public', 'brand');

  await Promise.all([
    requireFile(path.join(sourceBrand, 'mark.svg'), 'brand mark', root),
    requireFile(path.join(sourceBrand, 'wordmark.svg'), 'brand wordmark', root),
    requireFile(path.join(sourceFavicon, 'favicon.svg'), 'favicon', root),
  ]);

  // These two destination directories are owned by this sync script.
  await rm(path.join(destinationRoot, 'brand'), { recursive: true, force: true });
  await rm(path.join(destinationRoot, 'favicon'), { recursive: true, force: true });
  await mkdir(destinationRoot, { recursive: true });

  await Promise.all([
    cp(sourceBrand, path.join(destinationRoot, 'brand'), { recursive: true }),
    cp(sourceFavicon, path.join(destinationRoot, 'favicon'), { recursive: true }),
  ]);

  process.stdout.write('Brand assets synced to public/brand/\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await syncBrandAssets();
}
