// Adapt the canonical MOD resolver's ordered layer array to the rig renderer.
// Preserve the artist's layer order and reject duplicate or unsafe slot entries.
export function modLayersToRigMap(resolvedLayers) {
  if (!Array.isArray(resolvedLayers)) throw new TypeError('Resolved MOD layers must be an array');
  const map = Object.create(null);
  for (const layer of resolvedLayers) {
    if (!layer || typeof layer !== 'object' || Array.isArray(layer) ||
        typeof layer.slot !== 'string' || !/^[a-z][a-z0-9_]*$/.test(layer.slot) ||
        Object.hasOwn(map, layer.slot)) throw new Error('Invalid or duplicate MOD slot');
    if (layer.hidden === true || layer.transparent === true || layer.operation === 'hide') continue;
    const src = layer.src ?? layer.image ?? layer.path;
    if (typeof src !== 'string' || !src.trim()) throw new Error('Missing visible MOD artwork: ' + layer.slot);
    map[layer.slot] = {src, ...(layer.offset ? {offset: layer.offset} : {})};
  }
  return map;
}
