import { createHash } from 'node:crypto';

// Integrity metadata for exported diagnostic assets, not final character artwork.
export function buildPreviewManifest(assets) {
  if (!Array.isArray(assets) || assets.length !== 2) throw new TypeError('Expected two preview assets');
  const seen = new Set();
  const previews = assets.map(({ variant, filename, svg, frames }) => {
    if (!['chibi', 'adult'].includes(variant) || seen.has(variant)) throw new TypeError('Invalid or duplicate variant');
    seen.add(variant);
    if (filename !== `nova-${variant}-typing-rig.svg` || typeof svg !== 'string' || !svg.startsWith('<svg ') || !svg.endsWith('</svg>') || !Number.isInteger(frames) || frames < 2) throw new TypeError('Invalid preview asset');
    return { variant, filename, frames, bytes: Buffer.byteLength(svg, 'utf8'), sha256: createHash('sha256').update(svg, 'utf8').digest('hex') };
  });
  return { schemaVersion: 1, artifactType: 'rig-diagnostic-only', previews };
}
