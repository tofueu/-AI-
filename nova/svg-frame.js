// Export an animated NOVA rig pose as a standalone SVG frame.
// This does not alter or embed the original MOD image files.
import {sampleClip} from './rig-animation.js';
import {bindRigLayers} from './rig-layers.js';

const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const positive = n => typeof n === 'number' && Number.isFinite(n) && n > 0;
const finite = n => typeof n === 'number' && Number.isFinite(n);
const safeSource = src => {
  if (typeof src !== 'string' || !src.trim() || /[\u0000-\u001f\u007f]/.test(src) || /^(?:javascript|data|https?):/i.test(src.trim()) || src.trim().startsWith('//')) throw new Error('Unsafe image source');
  return src;
};
/** Renderer-independent frame export; image paths must be resolved by the caller. */
export function renderNovaSvgFrame(clip, layers, seconds, {width=512,height=512,layerSize=128,originX=width/2,originY=height/2,loop=true}={}) {
  if (![width,height,layerSize].every(positive) || ![originX,originY].every(finite)) throw new Error('Invalid SVG dimensions');
  const sample = sampleClip(clip,seconds,{loop});
  const bound = bindRigLayers(sample,layers);
  const images = bound.map(layer => {
    const src = escapeXml(safeSource(layer.src));
    const x = originX + layer.x, y = originY + layer.y;
    return `<image data-slot="${escapeXml(layer.slot)}" href="${src}" width="${layerSize}" height="${layerSize}" x="${-layerSize/2}" y="${-layerSize/2}" transform="translate(${x} ${y}) rotate(${layer.rotation})"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-variant="${sample.variant}">${images}</svg>`;
}
