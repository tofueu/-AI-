// NOVA character MOD manifest resolver. Pure data; rendering and PSD export are separate.
export const NOVA_SLOTS = Object.freeze(['body','head','eyes','mouth','hairBack','hairFront','outfit','hat','accessory','armL','armR','legL','legR']);
const REQUIRED = new Set(['body','head','outfit']);
const VARIANTS = new Set(['chibi','adult']);
const safePath = path => typeof path === 'string' && path.length > 0 && path.length <= 240 && !path.startsWith('/') && !path.includes('\\') && path.split('/').every(part => part !== '' && part !== '.' && part !== '..') && /\.png$/i.test(path);
function validateLayer(layer, slot) {
  if (layer === null) return null;
  if (!layer || typeof layer !== 'object' || Array.isArray(layer) || !safePath(layer.path)) throw new Error(`Invalid PNG layer: ${slot}`);
  if (layer.visible !== undefined && typeof layer.visible !== 'boolean') throw new Error(`Invalid visibility: ${slot}`);
  return {path:layer.path,visible:layer.visible !== false};
}
export function resolveNovaMod(base, mod = {}) {
  if (!base || !VARIANTS.has(base.variant)) throw new Error('Invalid base character variant');
  if (mod.variant !== undefined && mod.variant !== base.variant) throw new Error('MOD variant mismatch');
  if (!base.layers || typeof base.layers !== 'object' || Array.isArray(base.layers)) throw new Error('Invalid base layers');
  if (!mod.layers || typeof mod.layers !== 'object' || Array.isArray(mod.layers)) {
    if (mod.layers !== undefined) throw new Error('Invalid MOD layers');
  }
  const overrides = mod.layers || {};
  for (const key of [...Object.keys(base.layers),...Object.keys(overrides)]) if (!NOVA_SLOTS.includes(key)) throw new Error(`Unknown layer slot: ${key}`);
  const layers = {}, fallbacks = [];
  for (const slot of NOVA_SLOTS) {
    const original = base.layers[slot] === undefined ? null : validateLayer(base.layers[slot],slot);
    if (REQUIRED.has(slot) && (!original || !original.visible)) throw new Error(`Missing base clothing/body layer: ${slot}`);
    const hasOverride = Object.prototype.hasOwnProperty.call(overrides,slot);
    const selected = hasOverride ? validateLayer(overrides[slot],slot) : original;
    if (REQUIRED.has(slot) && (!selected || !selected.visible)) {
      layers[slot] = original;
      fallbacks.push(slot);
    } else {
      layers[slot] = selected;
    }
  }
  return {variant:base.variant,layers,fallbacks};
}
