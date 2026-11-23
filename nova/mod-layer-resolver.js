import { NOVA_MOD_SLOTS } from './mod-slot-template.js';

// Resolve artist-supplied layers without modifying the original rig.
// Mandatory body/outfit layers cannot be hidden, even by a malformed MOD.
export function resolveNovaModLayers(basePose, mod) {
  if (!basePose || !['chibi', 'adult'].includes(basePose.variant) || !Array.isArray(basePose.layers)) throw new TypeError('Invalid base pose');
  if (!mod || mod.variant !== basePose.variant || !mod.layers || typeof mod.layers !== 'object' || Array.isArray(mod.layers)) throw new TypeError('Invalid MOD');
  const slots = new Set(NOVA_MOD_SLOTS);
  const entries = Object.entries(mod.layers);
  for (const [slot] of entries) if (!slots.has(slot)) throw new TypeError('Unknown MOD slot');
  const operations = new Map(entries);
  const required = new Set(['body', 'outfit']);
  const seen = new Set();
  const result = [];
  for (const layer of basePose.layers) {
    if (!layer || !slots.has(layer.slot) || seen.has(layer.slot) || typeof layer.src !== 'string') throw new TypeError('Invalid base layer');
    seen.add(layer.slot);
    const spec = operations.get(layer.slot) ?? { operation: 'inherit' };
    if (!spec || !['inherit', 'hide', 'replace'].includes(spec.operation)) throw new TypeError('Invalid MOD operation');
    if (spec.operation === 'hide' && !required.has(layer.slot)) continue;
    const resolved = { ...layer, transform: layer.transform == null ? layer.transform : structuredClone(layer.transform) };
    if (spec.operation === 'replace') {
      // Only normalized, relative PNG paths inside the MOD asset root are accepted.
      if (typeof spec.src !== 'string' || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.png$/i.test(spec.src)) throw new TypeError('Unsafe MOD asset');
      resolved.src = spec.src;
    }
    result.push(resolved);
  }
  // A MOD must not silently discard edits targeting layers absent from this pose.
  for (const [slot, spec] of operations) {
    if (!seen.has(slot)) throw new TypeError('Missing base layer for MOD slot: ' + slot);
  }
  return { variant: basePose.variant, layers: result };
}
