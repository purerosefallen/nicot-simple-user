#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { builtinModules } = require('node:module');
const { spawnSync } = require('node:child_process');

const BUILD_DIR = '.build';
const DIST_DIR = 'dist';

function walk(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(file, extension);
    return entry.isFile() && entry.name.endsWith(extension) ? [file] : [];
  });
}

function externalPackages() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const packages = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ];
  return [...new Set([
    ...packages.flatMap((name) => [name, `${name}/*`]),
    ...builtinModules,
    ...builtinModules.map((name) => `node:${name}`),
  ])];
}

function compileWithNest() {
  console.log('[typescript] Running the Nest compiler with Swagger metadata ...');
  const result = spawnSync(
    process.execPath,
    [path.resolve('node_modules/@nestjs/cli/bin/nest.js'), 'build', '--path', 'tsconfig.esm.json'],
    { stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Nest compiler exited with ${result.status}`);
}

function entryPoints() {
  const entries = { index: path.join(BUILD_DIR, 'index.js') };
  for (const file of walk(path.join(BUILD_DIR, 'src'), '.js')) {
    const relative = path.relative(BUILD_DIR, file).replace(/\.js$/, '');
    entries[relative] = file;
  }
  return entries;
}

async function bundle(format, external) {
  const isCjs = format === 'cjs';
  console.log(`[build] ${format} -> dist/**/*.${isCjs ? 'cjs' : 'mjs'}`);
  const { build } = await import('esbuild');
  await build({
    entryPoints: entryPoints(),
    outdir: DIST_DIR,
    outExtension: { '.js': isCjs ? '.cjs' : '.mjs' },
    bundle: true,
    sourcemap: true,
    format,
    platform: 'node',
    target: isCjs ? 'node22' : 'esnext',
    packages: 'external',
    external,
    logLevel: 'info',
  });
}

function copyDeclarations() {
  for (const file of walk(BUILD_DIR, '.d.ts')) {
    const target = path.join(DIST_DIR, path.relative(BUILD_DIR, file));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target);
  }
  console.log('[types] Declarations copied from the Nest compiler output.');
}

function verifyMetadata() {
  for (const extension of ['mjs', 'cjs']) {
    const output = fs.readFileSync(path.join(DIST_DIR, `index.${extension}`), 'utf8');
    for (const marker of ['design:paramtypes', '_OPENAPI_METADATA_FACTORY']) {
      if (!output.includes(marker)) {
        throw new Error(`${marker} is missing from dist/index.${extension}`);
      }
    }
  }
  console.log('[verify] Nest decorator and Swagger metadata preserved in ESM and CJS.');
}

(async () => {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  try {
    compileWithNest();
    const external = externalPackages();
    await bundle('cjs', external);
    await bundle('esm', external);
    copyDeclarations();
    verifyMetadata();
  } finally {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error('[build] Failed:', error);
  process.exitCode = 1;
});
