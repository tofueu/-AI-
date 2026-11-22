import { NOVA_MOD_SLOTS } from './mod-slot-template.js';

// Resolve an artist MOD without mutating the original rig or its assets.
// A hidden optional layer is removed; mandatory body/outfit always inherit
// their base artwork when a MOD attempts to hide them.
export function resolveNovaModLayers(basePose, mod) {
  if (!basePose || !['chibi', 'adult'].includes(basePose.variant) || !Array.isArray(basePose.layers)) throw new TypeError('Invalid base pose');
  if (!mod || mod.variant !== basePose.variant || !mod.layers || typeof mod.layers !== 'object' || Array.isArray(mod.layers)) throw new TypeError('Invalid MOD');
  for (const slot of Object.keys(mod.layers)) if (!NOVA_MOD_SLOTS.includes(slot)) throw new TypeError('Unknown MOD slot');
  const required = new Set(['body', 'outfit']);
  const result = [];
  for (const layer of basePose.layers) {
    if (!layer || !NOVA_MOD_SLOTS.includes(layer.slot)) throw new TypeError('Invalid base layer');
    const spec = mod.layers[layer.slot] ?? { operation: 'inherit' };
    if (!spec || !['inherit', 'hide', 'replace'].includes(spec.operation)) throw new TypeError('Invalid MOD operation');
    if (spec.operation === 'hide' && !required.has(layer.slot)) continue;
    if (spec.operation === 'replace') {
      if (typeof spec.src !== 'string' || !/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9_./-]+\.png$/.test(spec.src)) throw new TypeError('Unsafe MOD asset');
      result.push({ ...layer, src: spec.src, transform: { ...layer.transform } });
    } else result.push({ ...layer, transform: { ...layer.transform } });
  }
  return { variant: basePose.variant, layers: result };
}
