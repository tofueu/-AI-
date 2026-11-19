// Validate PNG bytes before exposing a MOD layer to the renderer.
// The existing inspector checks PNG headers, not full pixel decoding/CRC.
import {inspectNovaModAssets} from './nova-mod-asset-validation.js';
import {resolveNovaModLayers} from './nova-mod-layer-resolver.js';

export function resolveInspectedNovaMod(manifest, files, baseLayers, options = {}) {
  const inspection = inspectNovaModAssets(manifest, files, options);
  if (!inspection.valid) {
    const detail = inspection.errors.map(e => `${e.slot}: ${e.reason}`).join('; ');
    throw new Error(`Invalid NOVA MOD artwork: ${detail}`);
  }
  // Only inspected PNGs may be selected. An uninspected/hidden layer cannot
  // accidentally become drawable merely because its filename exists.
  const verifiedFiles = Object.create(null);
  for (const slot of inspection.validSlots) {
    const path = manifest.layers[slot].path;
    verifiedFiles[path] = files[path];
  }
  const resolved = resolveNovaModLayers(manifest, verifiedFiles, baseLayers);
  return {...resolved, inspection};
}
