// Layered SVG MOD whiteboard. Placeholder art, not an official character render.
export const NOVA_MOD_SLOTS = Object.freeze(['body','head','eyes','mouth','hair','outfit','hat','accessory']);
function validateFullCharacterPath(path) {
  if (typeof path !== 'string' || /^[\w./-]+$/.test(path) || path.startsWith('/') || path.split('/').includes('..') || !/\.png$/i.test(path))) throw new TypeError('Invalid MOD PNG path: fullCharacter');
}
export function renderLayeredCharacterTemplate({variant='chibi',layers={},fullCharacter=null}={}) {
  if (!['chibi','adult'].includes(variant)) throw new RangeError('Invalid NOVA variant');
  if (!layers || typeof layers !== 'object' || Array.isArray(layers)) throw new TypeError('Invalid layers');
  for (const [slot,path] of Object.entries(layers)) {
    if (!NOVA_MOD_SLOTS.includes(slot)) throw new RangeError('Unknown MOD slot: '+slot);
    if (path !== null && typeof path !== 'string') throw new TypeError('Invalid MOD layer: '+slot);
    if (typeof path === 'string' && (!/^[\w./-]+$/.test(path) || path.startsWith('/') || path.split('/').includes('..') || !/\.png$/i.test(path))) throw new TypeError('Invalid MOD PNG path: '+slot);
  }
  if (fullCharacter !== null) {
    validateFullCharacterPath(fullCharacter);
    if (Object.values(layers).some(Boolean)) throw new TypeError('Full-character MOD cannot mix with individual layers');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 340" width="320" height="340" role="img" aria-label="NOVA ${variant} full-character MOD" data-variant="${variant}">\n<g id="nova-full-character"><image href="${fullCharacter}" x="0" y="0" width="320" height="340" preserveAspectRatio="xMidYMid meet"/></g>\n</svg>\n`;
  }
  const headY=variant==='chibi'?93:72, headR=variant==='chibi'?55:37;
  const fallback={
    body:'<ellipse cx="160" cy="225" rx="49" ry="74" fill="#f1dbe8"/>',
    head:`<circle cx="160" cy="${headY}" r="${headR}" fill="#f1dbe8" stroke="#634a91" stroke-width="3"/>`,
    outfit:'<path d="M113 179 Q160 157 207 179 L224 267 Q160 287 96 267 Z" fill="#9b82c7" stroke="#634a91" stroke-width="3"/>'
  };
  const order=['body','head','outfit','eyes','mouth','hair','hat','accessory'];
  const groups=order.map(slot=>{
    const path=layers[slot];
    const body=path?`<image href="${path}" x="0" y="0" width="320" height="340" preserveAspectRatio="xMidYMid meet"/>`:(fallback[slot]??'');
    return `<g id="nova-slot-${slot}" data-slot="${slot}"${body?'':' display="none"'}>${body}</g>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 340" width="320" height="340" role="img" aria-label="NOVA ${variant} editable MOD template" data-variant="${variant}">\n${groups}\n</svg>\n`;
}
