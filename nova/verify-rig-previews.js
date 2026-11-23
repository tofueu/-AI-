import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Verify actual exported files, not just in-memory strings used to build a manifest.
export async function verifyRigPreviews(directory) {
  if (typeof directory !== 'string' || !directory.trim()) throw new TypeError('Output directory required');
  const root = resolve(directory);
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.artifactType !== 'rig-diagnostic-only' ||
      !Array.isArray(manifest.previews) || manifest.previews.length !== 2) {
    throw new TypeError('Invalid diagnostic manifest');
  }
  const variants = new Set();
  for (const entry of manifest.previews) {
    if (!entry || !['chibi', 'adult'].includes(entry.variant) || variants.has(entry.variant) ||
        entry.filename !== `nova-${entry.variant}-typing-rig.svg` ||
        !Number.isInteger(entry.frames) || entry.frames < 2 ||
        !Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 ||
        typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      throw new TypeError('Invalid diagnostic preview entry');
    }
    variants.add(entry.variant);
    const svg = await readFile(join(root, entry.filename));
    if (svg.byteLength !== entry.bytes ||
        createHash('sha256').update(svg).digest('hex') !== entry.sha256 ||
        !svg.toString('utf8').startsWith('<svg ') ||
        !svg.toString('utf8').endsWith('</svg>')) {
      throw new Error(`Corrupt diagnostic preview: ${entry.variant}`);
    }
  }
  const gallery = await readFile(join(root, 'index.html'), 'utf8');
  for (const variant of variants) {
    if (!gallery.includes(`nova-${variant}-typing-rig.svg`)) throw new Error('Gallery missing preview: ' + variant);
  }
  return { verified: [...variants].sort(), previews: manifest.previews.length };
}
