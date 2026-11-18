import {resolveNovaMod} from './character-mod.js';
import {readFile, writeFile, realpath} from 'node:fs/promises';
import {resolve, relative, isAbsolute, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderPortableNovaModSvg} from './portable-mod-svg.js';

const usage = 'Usage: node nova/export-portable-svg.js <manifest.json> <assets-directory> <output.svg>';
export async function exportPortableNovaSvg(manifestFile, assetsDirectory, outputFile) {
  if (![manifestFile, assetsDirectory, outputFile].every(v => typeof v === 'string' && v.length)) throw Error(usage);
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  if (!manifest || !manifest.base) throw Error('Missing base character');
  const root = await realpath(resolve(assetsDirectory));
  const assets = Object.create(null);
  const {layers} = resolveNovaMod(manifest.base, manifest.mod ?? {});
  for (const layer of Object.values(layers)) {
    if (!layer?.visible) continue;
    const file = resolve(root, layer.path);
    const rel = relative(root, file);
    if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) throw Error('Asset escapes directory');
    // Resolve symlinks before reading; lexical path checks alone allow escapes.
    const actual = await realpath(file);
    const actualRel = relative(root, actual);
    if (actualRel === '..' || actualRel.startsWith('..' + sep) || isAbsolute(actualRel)) throw Error('Asset escapes directory');
    assets[layer.path] = await readFile(actual);
  }
  const result = renderPortableNovaModSvg(manifest.base, manifest.mod ?? {}, assets, manifest.options ?? {});
  await writeFile(outputFile, result.svg, 'utf8');
  return {variant:result.variant, embeddedPaths:result.embeddedPaths, outputFile};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  exportPortableNovaSvg(...process.argv.slice(2)).then(r => {
    process.stdout.write(JSON.stringify(r) + '\n');
  }).catch(e => {process.stderr.write(e.message + '\n');process.exitCode=1;});
}
