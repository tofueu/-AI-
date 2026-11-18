import {createNovaBlankTemplate} from './blank-template.js';
import {resolveNovaMod} from './character-mod.js';

const escapeXml = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;');

/** Compose an editable, transparent, variant-sized SVG with one named group per MOD slot.
 * The returned SVG references external PNG assets; it does not embed them or produce PSD.
 */
export function composeNovaLayeredSvg(base, mod = {}, {assetPrefix = '', guides = false} = {}) {
  if (typeof guides !== 'boolean') throw new Error('Invalid guides option');
  if (typeof assetPrefix !== 'string' || (assetPrefix && !/^(?:[a-zA-Z0-9_-]+\/)*$/.test(assetPrefix))) throw new Error('Invalid asset prefix');
  const resolved = resolveNovaMod(base, mod);
  const template = createNovaBlankTemplate(resolved.variant, {guides});
  let svg = template.svg;
  for (const slot of template.slots) {
    const layer = resolved.layers[slot];
    if (!layer || !layer.visible) continue;
    const href = escapeXml(assetPrefix + layer.path);
    const image = `<image href="${href}" x="0" y="0" width="${template.width}" height="${template.height}" preserveAspectRatio="xMidYMid meet"/>`;
    const marker = `<g id="layer-${slot}" data-slot="${slot}" data-mod-slot="${slot}"></g>`;
    svg = svg.replace(marker, `<g id="layer-${slot}" data-slot="${slot}" data-mod-slot="${slot}">${image}</g>`);
  }
  return {variant:resolved.variant, width:template.width, height:template.height, slots:template.slots, fallbacks:resolved.fallbacks, svg};
}
