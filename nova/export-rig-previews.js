// Generate the two real, playable rig-diagnostic SVG artifacts from the checked-out repository.
// Usage: node nova/export-rig-previews.js [output-directory]
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildRigFrameSequence } from './rig-frame-sequence.js';
import { NOVA_TYPING_CLIPS } from './typing-clips.js';
import { renderAnimatedRigSvg } from './rig-animated-svg.js';
import { renderRigPreviewGallery } from './rig-preview-gallery.js';

export async function exportRigPreviews(outputDirectory) {
  if (typeof outputDirectory !== 'string' || !outputDirectory.trim()) {
    throw new TypeError('An output directory is required');
  }
  const target = resolve(outputDirectory);
  await mkdir(target, { recursive: true });
  const results = [];
  for (const variant of ['chibi', 'adult']) {
    const sequence = buildRigFrameSequence(NOVA_TYPING_CLIPS[variant], { fps: 20 });
    const svg = renderAnimatedRigSvg(sequence);
    const path = join(target, `nova-${variant}-typing-rig.svg`);
    await writeFile(path, svg, 'utf8');
    results.push({ variant, path, frames: sequence.frames.length });
  }
  await writeFile(join(target, 'index.html'), renderRigPreviewGallery(), 'utf8');
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  exportRigPreviews(process.argv[2] ?? 'nova/previews')
    .then(results => results.forEach(item => console.log(`${item.variant}: ${item.frames} frames -> ${item.path}`)))
    .catch(error => { console.error(error); process.exitCode = 1; });
}
