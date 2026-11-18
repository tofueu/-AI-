// Validate a NOVA template bundle before writing user-supplied artwork to disk.
// This is a metadata and path validator; it does not decode PNG pixels.
const SLOTS = Object.freeze(['body','head','eyes','mouth','hairBack','hairFront','outfit','hat','accessory','armL','armR','legL','legR']);
const REQUIRED = Object.freeze(['body','head','outfit']);
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const plain = obj => obj !== null && typeof obj === 'object' && !Array.isArray(obj);
const safePng = path => typeof path === 'string' && path.length <= 240 && /^artwork\/[A-Za-z0-9_-]+\.png$/i.test(path) && !path.includes('..');
export function validateNovaModPackage(manifest, files = {}) {
  if (!plain(manifest) || manifest.schemaVersion !== 1) throw new Error('Unsupported NOVA manifest schema');
  if (!['chibi','adult'].includes(manifest.variant)) throw new Error('Invalid NOVA variant');
  if (!plain(manifest.canvas) || !Number.isInteger(manifest.canvas.width) || !Number.isInteger(manifest.canvas.height) || manifest.canvas.width < 1 || manifest.canvas.height < 1 || manifest.canvas.width > 4096 || manifest.canvas.height > 4096) throw new Error('Invalid canvas');
  if (!Array.isArray(manifest.slots) || manifest.slots.length !== SLOTS.length || manifest.slots.some((slot, i) => slot !== SLOTS[i])) throw new Error('Invalid slots');
  if (!Array.isArray(manifest.requiredSlots) || manifest.requiredSlots.length !== REQUIRED.length || manifest.requiredSlots.some((slot, i) => slot !== REQUIRED[i])) throw new Error('Invalid required slots');
  if (!plain(manifest.layers) || Object.keys(manifest.layers).some(slot => !SLOTS.includes(slot))) throw new Error('Invalid layers');
  if (!plain(files)) throw new Error('Invalid file collection');
  const missing = [], hidden = [], present = [];
  for (const slot of SLOTS) {
    if (!has(manifest.layers, slot)) throw new Error(`Missing layer declaration: ${slot}`);
    const layer = manifest.layers[slot];
    if (layer === null) { missing.push(slot); continue; }
    if (!plain(layer) || !safePng(layer.path) || typeof layer.visible !== 'boolean') throw new Error(`Invalid layer: ${slot}`);
    if (layer.visible === false) { hidden.push(slot); continue; }
    if (!has(files, layer.path)) missing.push(slot);
    else present.push(slot);
  }
  // The base character resolver supplies missing required layers.
  return {variant:manifest.variant, present, hidden, missing, needsBase:REQUIRED.filter(slot => !present.includes(slot))};
}
