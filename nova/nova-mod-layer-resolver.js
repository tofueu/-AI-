// Resolve a validated NOVA MOD manifest into drawable layers.
// This module does not decode PNG files or alter source artwork.
import { validateNovaModPackage } from './nova-mod-package-validator.js';

const SLOTS = ['body','head','eyes','mouth','hairBack','hairFront','outfit','hat','accessory','armL','armR','legL','legR'];
const REQUIRED = new Set(['body','head','outfit']);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const safeAsset = path => typeof path === 'string' && /^artwork\/[A-Za-z0-9_-]+\.png$/i.test(path) && !path.includes('..');

export function resolveNovaModLayers(manifest, files, baseLayers) {
  const status = validateNovaModPackage(manifest, files);
  if (baseLayers === null || typeof baseLayers !== 'object' || Array.isArray(baseLayers)) throw new Error('Invalid base layers');
  if (Object.keys(baseLayers).some(slot => !SLOTS.includes(slot))) throw new Error('Unknown base layer');
  const layers = {};
  const usedBase = [];
  for (const slot of SLOTS) {
    const mod = manifest.layers[slot];
    const supplied = status.present.includes(slot);
    if (supplied) {
      layers[slot] = {path:mod.path, source:'mod', visible:true};
      continue;
    }
    // Optional hidden layers remain hidden; required layers cannot remove the base costume.
    if (status.hidden.includes(slot) && !REQUIRED.has(slot)) {
      layers[slot] = null;
      continue;
    }
    const fallback = baseLayers[slot];
    if (fallback !== undefined && fallback !== null) {
      if (!safeAsset(fallback)) throw new Error('Invalid base layer path: ' + slot);
      layers[slot] = {path:fallback, source:'base', visible:true};
      usedBase.push(slot);
    } else {
      if (REQUIRED.has(slot)) throw new Error('Missing required base layer: ' + slot);
      layers[slot] = null;
    }
  }
  return {variant:status.variant, layers, usedBase, status};
}
