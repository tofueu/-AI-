// Editable SVG guide sheets for MOD artists; these are NOT final character artwork.
// Each layer is a separate full-canvas SVG, aligned to the renderer's joint pivots.
import { NOVA_SLOTS } from './character-mod.js';

const PIVOTS = Object.freeze({
  root:[.5,.53],head:[.5,.25],armL:[.35,.38],armR:[.65,.38],
  legL:[.43,.68],legR:[.57,.68]
});
const HEAD = new Set(['head','eyes','mouth','hairBack','hairFront','hat']);
const LIMBS = new Set(['armL','armR','legL','legR']);
const REQUIRED = new Set(['body','head','outfit']);
const xml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

export function makeNovaModGuide(variant, slot, size = 512) {
  if (!['chibi','adult'].includes(variant)) throw Error('Invalid variant');
  if (!NOVA_SLOTS.includes(slot)) throw Error('Invalid slot');
  if (!Number.isSafeInteger(size) || size < 64 || size > 2048) throw Error('Invalid guide size');
  const joint = HEAD.has(slot) ? 'head' : LIMBS.has(slot) ? slot : 'root';
  const [px,py] = PIVOTS[joint];
  const x = px*size, y = py*size;
  const headRadius = (variant === 'chibi' ? .19 : .125)*size;
  const bodyTop = (variant === 'chibi' ? .43 : .35)*size;
  const bodyBottom = (variant === 'chibi' ? .73 : .77)*size;
  const silhouette = `<circle cx="${size/2}" cy="${size*.25}" r="${headRadius}" fill="none" stroke="#888" stroke-dasharray="6 5"/><path d="M ${size*.35} ${bodyTop} L ${size*.65} ${bodyTop} L ${size*.62} ${bodyBottom} L ${size*.38} ${bodyBottom} Z" fill="none" stroke="#888" stroke-dasharray="6 5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><title>NOVA ${xml(variant)} ${xml(slot)} guide</title><g id="reference" opacity=".45">${silhouette}</g><g id="joint-guide"><path d="M ${x-12} ${y} h24 M ${x} ${y-12} v24" stroke="#d22" stroke-width="2"/><circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#d22"/></g><g id="artwork" data-slot="${xml(slot)}" data-joint="${joint}" data-required="${REQUIRED.has(slot)}"></g></svg>`;
}

export function makeNovaModGuideSet(variant, size = 512) {
  return Object.fromEntries(NOVA_SLOTS.map(slot => [slot + '.svg', makeNovaModGuide(variant,slot,size)]));
}
