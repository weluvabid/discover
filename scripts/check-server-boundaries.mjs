import { builtinModules } from 'node:module';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const builtins = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);
const sourceExtensions = new Set(['.astro', '.js', '.jsx', '.mjs', '.ts', '.tsx']);
const importPattern = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"]([^'"]+)['"]/g;
const violations = [];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'deprecated' || entry.name === 'server') continue;

      files.push(...(await collect(absolute)));
    } else if (
      entry.isFile() &&
      sourceExtensions.has(path.extname(entry.name)) &&
      !/\.(?:test|spec)\.[^.]+$/.test(entry.name)
    ) {
      files.push(absolute);
    }
  }

  return files;
}

function resolveImport(sourceFile, specifier) {
  if (specifier.startsWith('@/')) return path.resolve(root, specifier.slice(2));

  if (specifier.startsWith('.')) return path.resolve(path.dirname(sourceFile), specifier);

  return undefined;
}

for (const file of await collect(root)) {
  const source = await readFile(file, 'utf8');

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];

    if (builtins.has(specifier)) {
      violations.push(`${path.relative(root, file)} imports Node builtin "${specifier}"`);
      continue;
    }

    const resolved = resolveImport(file, specifier);

    const serverRoot = path.join(root, 'server');

    if (resolved && (resolved === serverRoot || resolved.startsWith(`${serverRoot}${path.sep}`))) {
      violations.push(`${path.relative(root, file)} imports server-only module "${specifier}"`);
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(
    `Browser/server boundary violations:\n${violations.map((item) => `- ${item}`).join('\n')}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write('Browser/server dependency boundaries are clean.\n');
}
