// Bridge validated portable MOD manifests into the existing NOVA frame composer.
// Keep the source manifests and base artwork immutable.
import {importNovaModManifest} from './mod-manifest.js';
import {composeNovaFrame} from './frame-composer.js';

export function composeNovaManifestFrame({variant,base={},manifests=[],safeOutfit={},state='idle',elapsedSeconds=0,loop=true}) {
  if (!Array.isArray(manifests)) throw new TypeError('NOVA manifests must be an array');
  const seen = new Set();
  const mods = manifests.map(raw => {
    const mod = importNovaModManifest(raw);
    if (mod.variant !== 'universal' && mod.variant !== variant) {
      throw new Error('Incompatible NOVA MOD variant: ' + mod.id);
    }
    if (seen.has(mod.id)) throw new Error('Duplicate NOVA MOD id: ' + mod.id);
    seen.add(mod.id);
    return mod;
  });
  return composeNovaFrame({variant,base,mods,safeOutfit,state,elapsedSeconds,loop});
}
