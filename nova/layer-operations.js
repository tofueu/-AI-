// Explicit MOD operation normalization: absent/blank template layers inherit,
// while an artist's intentional hide operation removes a visible layer.
// Keep this separate from manifest parsing so it can be reused by editors.
export function normalizeLayerOperation(layer) {
  if (layer === undefined || layer === null) return {operation:'inherit'};
  if (typeof layer !== 'object' || Array.isArray(layer)) throw new Error('Invalid layer operation');
  if (layer.operation === 'inherit') return {operation:'inherit'};
  if (layer.operation === 'hide') return {operation:'hide'};
  if (layer.operation !== undefined && layer.operation !== 'replace') throw new Error('Unknown layer operation');
  // Explicit replacement must never silently become inheritance.
  if (layer.operation === 'replace' && (layer.hidden === true || layer.transparent === true))
    throw new Error('Replacement requires visible image source');
  if (layer.hidden === true || layer.transparent === true) return {operation:'inherit'};
  if (typeof layer.src !== 'string' || !layer.src.trim()) throw new Error('Replacement needs an image');
  return {operation:'replace',src:layer.src};
}

export function applyLayerOperations(base={},modLayers={}) {
  const result={...base};
  for (const [slot,layer] of Object.entries(modLayers)) {
    const op=normalizeLayerOperation(layer);
    if (op.operation==='inherit') continue;
    if (op.operation==='hide') delete result[slot];
    else result[slot]={src:op.src};
  }
  return result;
}
