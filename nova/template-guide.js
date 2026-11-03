// Export a NOVA blank-layer manifest as a ready-to-save SVG guide.
// Transparent PNG layers can be created with tools/export_blank_layers.py when available.
import {validateNovaModTemplate} from './mod-template.js';
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
export function renderNovaTemplateGuide(manifest) {
  validateNovaModTemplate(manifest);
  const {width,height}=manifest.canvas;
  const rows=manifest.layers.map((layer,i)=>`<text x="16" y="${30+i*24}" font-size="15" fill="#333">${esc(layer.filename)} — ${esc(layer.slot)} (${layer.anchor.x}, ${layer.anchor.y})</text>`).join('');
  const guideHeight=Math.max(height,manifest.layers.length*24+48);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${guideHeight}" viewBox="0 0 ${width} ${guideHeight}"><rect width="100%" height="100%" fill="#fff"/><title>NOVA ${esc(manifest.variant)} layer guide</title>${rows}</svg>`;
}
