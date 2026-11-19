// CLI: node nova/nova-mod-validate-cli.js /path/to/mod-directory
// Reads only manifest-declared artwork; never follows arbitrary manifest paths.
import {readFile, realpath} from 'node:fs/promises';
import {resolve, join, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {inspectNovaModAssets} from './nova-mod-asset-validation.js';
import {validateNovaModPackage} from './nova-mod-package-validator.js';

export async function validateNovaModDirectory(directory) {
  const root = await realpath(resolve(directory));
  const manifestPath = join(root, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  // Validate the schema and path syntax before any artwork is read.
  validateNovaModPackage(manifest, {});
  const files = Object.create(null);
  for (const layer of Object.values(manifest.layers)) {
    if (!layer || !layer.visible) continue;
    const target = resolve(root, layer.path);
    if (!target.startsWith(root + sep)) throw new Error('Artwork escapes MOD directory');
    try {
      // realpath also prevents a symlink in artwork/ from escaping the MOD root.
      const canonical = await realpath(target);
      if (!canonical.startsWith(root + sep)) throw new Error('Artwork symlink escapes MOD directory');
      files[layer.path] = await readFile(canonical);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      // Leave absent files missing so the validator reports them as invalid.
    }
  }
  return inspectNovaModAssets(manifest, files);
}

async function main() {
  const directory = process.argv[2];
  if (!directory) throw new Error('Usage: node nova/nova-mod-validate-cli.js <mod-directory>');
  const report = await validateNovaModDirectory(directory);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (!report.valid) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(String(error.message ?? error) + '\n'); process.exitCode = 1; });
}
