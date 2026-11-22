import { importNovaModManifest } from './mod-import.js';
import { resolveModLayers } from './mod-layer-policy.js';

// Apply a validated MOD manifest without modifying the base artwork.
// Missing/hidden clothing always falls back to the visible base layer.
const CLOTHING = ['body', 'outfit', 'top', 'bottom', 'dress', 'outer'];
export function applyNovaModManifest({ baseLayers, manifest, variant, assetRoot = '' } = {}) {
  if (!Array.isArray(baseLayers)) throw new TypeError('Invalid base layers');
  if (variant !== 'chibi' && variant !== 'adult') throw new TypeError('Invalid character variant');
  const imported = importNovaModManifest(manifest, { assetRoot });
  if (imported.variant !== 'universal' && imported.variant !== variant) {
    throw new Error('NOVA MOD variant mismatch');
  }
  const originals = new Map(baseLayers.map(layer => [layer.slot, layer]));
  const modLayers = [];
  for (const [slot, entry] of Object.entries(imported.layers)) {
    if (entry.operation === 'inherit') continue;
    if (entry.operation === 'hide') {
      // A clothing hide request must not strip the base outfit.
      modLayers.push({ slot, src: '', hidden: true });
    } else {
      modLayers.push({ slot, src: entry.src, hidden: false });
    }
  }
  // Existing base metadata (anchor, pivot, z-index) survives replacement.
  const merged = modLayers.map(layer => ({
    ...(originals.get(layer.slot) ?? {}),
    ...layer
  }));
  return resolveModLayers({
    baseLayers,
    modLayers: merged,
    requiredClothing: CLOTHING
  });
}
