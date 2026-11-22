import { mkdir, writeFile, access } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNovaLayerWhiteboard, createNovaWhiteboardManifest } from './mod-layer-whiteboard.js';

// Export all 56 transparent, editable SVG drawing templates without overwriting artist work.
export async function exportNovaWhiteboards(directory, { overwrite = false } = {}) {
  if (typeof directory !== 'string' || !directory.trim()) throw new TypeError('Output directory required');
  if (typeof overwrite !== 'boolean') throw new TypeError('Invalid overwrite option');
  const root = resolve(directory);
  const result = { written: [], skipped: [] };
  for (const variant of ['chibi', 'adult']) {
    const manifest = createNovaWhiteboardManifest(variant);
    for (const entry of manifest.slots) {
      const target = resolve(root, entry.filename);
      if (!target.startsWith(root + sep)) throw new Error('Unsafe template path');
      await mkdir(resolve(root, variant), { recursive: true });
      if (!overwrite) {
        try { await access(target); result.skipped.push(entry.filename); continue; }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      const svg = createNovaLayerWhiteboard({ variant, slot: entry.slot });
      await writeFile(target, svg, { flag: overwrite ? 'w' : 'wx' });
      result.written.push(entry.filename);
    }
    const manifestPath = join(root, variant, 'manifest.json');
    if (!overwrite) {
      try { await access(manifestPath); result.skipped.push(variant + '/manifest.json'); continue; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: overwrite ? 'w' : 'wx' });
    result.written.push(variant + '/manifest.json');
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error('Usage: node nova/export-mod-whiteboards.js OUTPUT_DIRECTORY');
    process.exitCode = 2;
  } else {
    exportNovaWhiteboards(args[0]).then(
      result => console.log(JSON.stringify(result)),
      error => { console.error(error); process.exitCode = 1; }
    );
  }
}
