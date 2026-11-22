/** Pure MOD layer selection. Never modifies source artwork or the supplied layers. */
export function resolveModLayers({baseLayers, modLayers = [], requiredClothing = ['body', 'outfit']} = {}) {
  if (!Array.isArray(baseLayers) || !Array.isArray(modLayers)) throw new TypeError('Invalid MOD layers');
  if (!Array.isArray(requiredClothing) || requiredClothing.some(x => typeof x !== 'string')) throw new TypeError('Invalid clothing slots');
  const validate = (layer) => {
    if (!layer || typeof layer !== 'object' || Array.isArray(layer) || typeof layer.slot !== 'string' || !layer.slot) throw new TypeError('Invalid MOD layer');
    if (layer.src != null && typeof layer.src !== 'string') throw new TypeError('Invalid layer source');
    return layer;
  };
  const originals = baseLayers.map(validate);
  const mods = modLayers.map(validate);
  const unique = (layers) => {
    const slots = new Set();
    for (const layer of layers) {
      if (slots.has(layer.slot)) throw new TypeError('Duplicate MOD slot: ' + layer.slot);
      slots.add(layer.slot);
    }
  };
  unique(originals);
  unique(mods);
  const replacements = new Map(mods.map(layer => [layer.slot, layer]));
  const visible = layer => Boolean(layer.src && layer.src.trim() && !layer.hidden);
  const output = originals.map(base => {
    const mod = replacements.get(base.slot);
    if (!mod) return { ...base, hidden: !visible(base) };
    if (requiredClothing.includes(base.slot) && !visible(mod)) return { ...base, hidden: !visible(base) };
    return { ...mod, hidden: !visible(mod) };
  });
  for (const mod of mods) {
    if (!originals.some(base => base.slot === mod.slot)) {
      if (requiredClothing.includes(mod.slot) && !visible(mod)) continue;
      output.push({ ...mod, hidden: !visible(mod) });
    }
  }
  return output;
}
