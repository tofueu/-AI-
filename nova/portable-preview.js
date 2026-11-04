// Package an exported NOVA sequence as an offline HTML preview.
// Callers supply exact PNG bytes for each referenced MOD layer; originals are unchanged.
import {buildNovaPreviewHtml} from './html-preview.js';

const IMAGE_TAG = /<image\b[^>]*\bhref="([^"]+)"[^>]*\/>/g;
const PNG_SIGNATURE = Buffer.from([137,80,78,71,13,10,26,10]);

export function buildPortableNovaPreview(sequence, assets) {
  if (!sequence || !Array.isArray(sequence.frames) || !assets || typeof assets !== 'object' || Array.isArray(assets)) throw new Error('Invalid portable preview input');
  const embedded = sequence.frames.map(frame => {
    if (typeof frame?.svg !== 'string') throw new Error('Invalid SVG frame');
    let svg = frame.svg.replace(IMAGE_TAG, (tag, href) => {
      if (href.startsWith('data:') || !Object.hasOwn(assets, href)) throw new Error(`Missing MOD layer asset: ${href}`);
      const bytes = assets[href];
      if (!Buffer.isBuffer(bytes) || bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`Invalid PNG asset: ${href}`);
      return tag.replace(`href="${href}"`, `href="data:image/png;base64,${bytes.toString('base64')}"`);
    });
    if (/<image\b/i.test(svg.replace(IMAGE_TAG, ''))) throw new Error('Unsupported SVG image reference');
    return {...frame, svg};
  });
  return buildNovaPreviewHtml({...sequence, frames: embedded});
}
