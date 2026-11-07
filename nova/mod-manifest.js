// Validate a portable NOVA character MOD manifest without modifying source artwork.
import {LAYER_SLOTS, NOVA_VARIANTS} from './mod-layers.js';
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const safePath = value => typeof value === 'string' && value.trim() === value &&
  value.length > 0 && value.length <= 512 && !/[\x00-\x1f\x7f?#]/.test(value) &&
  !/^(?:[a-z][a-z0-9+.-]*:|\/|\\)/i.test(value) &&
  !value.split(/[\\/]/).includes('..') && /\.png$/i.test(value);
export function importNovaModManifest(manifest) {
  if (!isObject(manifest) || manifest.schemaVersion !== 1 ||
      typeof manifest.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(manifest.id) ||
      ![...NOVA_VARIANTS,'universal'].includes(manifest.variant) || !isObject(manifest.layers)) {
    throw new Error('Invalid NOVA MOD manifest');
  }
  const layers = Object.create(null);
  for (const [slot,part] of Object.entries(manifest.layers)) {
    if (!LAYER_SLOTS.includes(slot) || !isObject(part) ||
        !['inherit','hide','replace'].includes(part.operation)) throw new Error('Invalid NOVA MOD layer: '+slot);
    if (part.operation === 'replace') {
      if (!safePath(part.src)) throw new Error('Invalid NOVA MOD PNG path: '+slot);
      const copy = {operation:'replace',src:part.src};
      for (const key of ['width','height','anchorX','anchorY']) {
        if (part[key] === undefined) continue;
        const v=part[key];
        if (typeof v !== 'number' || !Number.isFinite(v) ||
          (key==='width'||key==='height' ? v<=0||v>8192 : v<0||v>1)) throw new Error('Invalid NOVA MOD dimension: '+key);
        copy[key]=v;
      }
      layers[slot]=copy;
    } else {
      if (part.src !== undefined) throw new Error('Non-replacement NOVA layer cannot include artwork: '+slot);
      layers[slot]={operation:part.operation};
    }
  }
  return {id:manifest.id,variant:manifest.variant,layers};
}
