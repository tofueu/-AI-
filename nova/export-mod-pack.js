import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { renderNovaModPack, validateNovaModPack } from './mod-pack.js';

// Export a portable, inspectable SVG whiteboard for every supplied character variant.
// The manifest remains unchanged; PNG references are relative to the output folder.
export async function exportNovaModPack(manifestPath, outputDirectory) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  validateNovaModPack(manifest);
  const output = resolve(outputDirectory);
  await mkdir(output, { recursive: true });
  const exported = [];
  for (const variant of Object.keys(manifest.variants)) {
    const filename = `nova-${variant}-mod.svg`;
    await writeFile(join(output, filename), renderNovaModPack(manifest, variant), 'utf8');
    exported.push(filename);
  }
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
