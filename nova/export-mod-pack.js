import { copyFile, lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve, join, dirname, relative, isAbsolute, sep } from 'node:path';
import { renderNovaModPack, validateNovaModPack } from './mod-pack.js';

// Export a portable, inspectable SVG whiteboard for every supplied character variant.
// The manifest remains unchanged; PNG references are relative to the output folder.
export async function exportNovaModPack(manifestPath, outputDirectory) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  validateNovaModPack(manifest);
  const output = resolve(outputDirectory);
  const sourceRoot = await realpath(dirname(resolve(manifestPath)));
  // Never export over a source pack (or into it): this could overwrite original PNGs.
  const fromSource = relative(sourceRoot, output);
  const fromOutput = relative(output, sourceRoot);
  const inside = path => path === '' || (path !== '..' && !path.startsWith('..' + sep) && !isAbsolute(path));
  if (inside(fromSource) || inside(fromOutput))
    throw new Error('MOD output must not overlap source pack directory');
  // Reject symlinks anywhere in an existing output path. Lexical overlap checks
  // alone cannot prevent an output symlink from redirecting writes to originals.
  async function assertNoOutputSymlinks(target) {
    const parts = resolve(target).split(sep);
    let current = parts[0] || sep;
    for (const part of parts.slice(1)) {
      if (!part) continue;
      current = join(current, part);
      let info;
      try { info = await lstat(current); }
      catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      if (info.isSymbolicLink()) throw new Error('MOD output contains symbolic link: ' + current);
    }
  }
  await assertNoOutputSymlinks(output);
  const paths = new Set();
  for (const definition of Object.values(manifest.variants)) {
    for (const asset of [...Object.values(definition.layers ?? {}), definition.fullCharacter]) {
      if (asset) paths.add(asset);
    }
  }
  const assets = [];
  for (const asset of paths) {
    const source = await realpath(resolve(sourceRoot, asset));
    const rel = relative(sourceRoot, source);
    if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel))
      throw new Error('MOD asset escapes pack directory: ' + asset);
    assets.push([source, join(output, asset)]);
  }
  await mkdir(output, { recursive: true });
  await assertNoOutputSymlinks(output);
  for (const [source, destination] of assets) {
    if (source === destination) continue;
    await assertNoOutputSymlinks(destination);
    await mkdir(dirname(destination), { recursive: true });
    await assertNoOutputSymlinks(destination);
    await copyFile(source, destination);
  }
  const exported = [];
  for (const variant of Object.keys(manifest.variants)) {
    const filename = `nova-${variant}-mod.svg`;
    await assertNoOutputSymlinks(join(output, filename));
    await writeFile(join(output, filename), renderNovaModPack(manifest, variant), 'utf8');
    exported.push(filename);
  }
  await assertNoOutputSymlinks(join(output, 'mod-pack.json'));
  await writeFile(join(output, 'mod-pack.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return exported;
}

if (process.argv[1] && import.meta.url === new URL('file://' + resolve(process.argv[1])).href) {
  if (process.argv.length !== 4) {
    console.error('Usage: node nova/export-mod-pack.js <manifest.json> <output-directory>');
    process.exitCode = 2;
  } else {
    exportNovaModPack(process.argv[2], process.argv[3])
      .then(files => console.log('Exported: ' + files.join(', ')))
      .catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
