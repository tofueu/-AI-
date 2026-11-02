// Pure layer resolver for Q and adult NOVA character MODs.
// Missing: inherit base. Hidden or transparent: do not render.
// Safe clothing fallback applies when no visible outfit layer remains.
export const NOVA_VARIANTS=Object.freeze(['chibi','adult']);
export const LAYER_SLOTS=Object.freeze(['body','head','eyes','brows','nose','mouth','hair_back','hair_front','hair_side','hat','top','bottom','dress','shoes','accessory','wings','tail']);
const CLOTHES=new Set(['top','bottom','dress']);
function validPart(part) {
  return part && typeof part==='object' && !Array.isArray(part) &&
    (part.hidden===true || part.transparent===true || (typeof part.src==='string' && part.src.length>0));
}
export function resolveNovaLayers({variant,base={},mods=[],safeOutfit={}}) {
  if (!NOVA_VARIANTS.includes(variant)) throw new Error('Unsupported NOVA variant');
  if (!Array.isArray(mods)) throw new Error('MODs must be an array');
  const resolved=new Map();
  for(const slot of LAYER_SLOTS) {
    const part=base[slot];
    if(part!==undefined) {
      if(!validPart(part)) throw new Error('Invalid base layer: '+slot);
      resolved.set(slot,part);
    }
  }
  for(const mod of mods) {
    if(!mod || (mod.variant!==variant && mod.variant!=='universal') || !mod.layers || typeof mod.layers!=='object') throw new Error('Incompatible MOD');
    for(const [slot,part] of Object.entries(mod.layers)) {
      if(!LAYER_SLOTS.includes(slot)||!validPart(part)) throw new Error('Invalid MOD layer: '+slot);
      resolved.set(slot,part);
    }
  }
  const visible=(slot)=>{const p=resolved.get(slot);return !!(p && !p.hidden && !p.transparent && p.src);};
  if(![...CLOTHES].some(visible)) {
    for(const slot of ['top','bottom']) {
      const fallback=safeOutfit[slot];
      if(!validPart(fallback)||fallback.hidden||fallback.transparent||!fallback.src) throw new Error('Missing safe outfit fallback: '+slot);
      resolved.set(slot,fallback);
    }
  }
  return LAYER_SLOTS.filter(visible).map(slot=>({slot,...resolved.get(slot)}));
}
