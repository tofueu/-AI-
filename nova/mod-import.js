// Convert a user-authored MOD manifest into resolver-compatible layers.
// Keep original manifests immutable and reject remote or escaping asset paths.
const SLOTS = new Set(['body','head','eyes','brows','nose','mouth','hair_back','hair_front','hair_side','hat','top','bottom','dress','shoes','accessory','wings','tail','leg_l','leg_r','shoes_l','shoes_r','arm_l','arm_r','hand_l','hand_r','outer','face']);
const VARIANTS = new Set(['chibi','adult','universal']);
function safePath(value) {
  if(typeof value!=='string' || !value.trim() || value!==value.trim() || value.includes('\\') || value.startsWith('/') || value.includes('?') || value.includes('#') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return false;
  return value.split('/').every(part=>part && part!=='.' && part!=='..' && !part.includes('\0')) && /\.png$/i.test(value);
}
export function importNovaModManifest(manifest,{assetRoot=''}={}) {
  if(!manifest || typeof manifest!=='object' || Array.isArray(manifest) || manifest.schemaVersion!==1 || !VARIANTS.has(manifest.variant)) throw new Error('Invalid NOVA MOD manifest');
  if(!manifest.layers || typeof manifest.layers!=='object' || Array.isArray(manifest.layers)) throw new Error('Invalid NOVA MOD layers');
  if(assetRoot && (typeof assetRoot!=='string' || !safePath(assetRoot+'/asset.png'))) throw new Error('Invalid MOD asset root');
  const layers=Object.create(null);
  for(const [slot,entry] of Object.entries(manifest.layers)) {
    if(!SLOTS.has(slot) || !entry || typeof entry!=='object' || Array.isArray(entry)) throw new Error('Invalid MOD slot: '+slot);
    const operation=entry.operation ?? 'replace';
    if(!['replace','hide','inherit'].includes(operation)) throw new Error('Invalid MOD operation: '+slot);
    if(operation==='replace') {
      if(!safePath(entry.src)) throw new Error('Invalid MOD PNG path: '+slot);
      layers[slot]={operation:'replace',src:assetRoot ? assetRoot+'/'+entry.src : entry.src};
    } else {
      if(entry.src!==undefined) throw new Error('Non-replacement slot cannot include PNG: '+slot);
      layers[slot]={operation};
    }
  }
  return {variant:manifest.variant,layers};
}
