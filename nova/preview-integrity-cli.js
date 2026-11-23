// Verify generated rig previews against their manifest without modifying any artifacts.
// Usage: node nova/preview-integrity-cli.js [preview-directory]
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function verifyRigPreviewDirectory(directory) {
  if (typeof directory !== 'string' || !directory.trim()) throw new TypeError('Preview directory required');
  const root = resolve(directory);
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.artifactType !== 'rig-diagnostic-only' ||
      !Array.isArray(manifest.previews) || manifest.previews.length !== 2) throw new Error('Invalid preview manifest');
  const seen = new Set();
  for (const entry of manifest.previews) {
    if (!['chibi', 'adult'].includes(entry.variant) || seen.has(entry.variant) ||
        entry.filename !== `nova-${entry.variant}-typing-rig.svg` ||
        !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 ||
        !Number.isSafeInteger(entry.frames) || entry.frames < 2 ||
        typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error('Invalid preview entry');
    seen.add(entry.variant);
    const bytes = await readFile(join(root, entry.filename));
    if (bytes.length !== entry.bytes ||
        createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error(`Preview integrity failure: ${entry.variant}`);
  }
  const gallery = await readFile(join(root, 'index.html'), 'utf8');
  for (const variant of seen) if (!gallery.includes(`nova-${variant}-typing-rig.svg`)) throw new Error(`Gallery missing ${variant}`);
  return { valid: true, variants: [...seen].sort() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  verifyRigPreviewDirectory(process.argv[2] ?? 'nova/previews')
    .then(result => console.log(`Verified: ${result.variants.join(', ')}`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
