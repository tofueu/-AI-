// Bridge the 20-slot artist whiteboard to the current NOVA MOD runtime.
// Does not pretend a PNG is a Live2D .moc3 model.
import {NOVA_MOD_SLOTS} from './first-sheet-whiteboard.js';
import {LAYER_SLOTS,NOVA_VARIANTS,resolveNovaLayers} from './mod-layers.js';
import {validateNovaModAssets} from './mod-png-validation.js';

const UNSUPPORTED=Object.freeze(NOVA_MOD_SLOTS.filter(slot=>!LAYER_SLOTS.includes(slot)));

export function importNovaWhiteboardMod(manifest,{base={},safeOutfit={}}={}) {
  if(!manifest || manifest.format!=='nova-mod-whiteboard-v1' ||
     !NOVA_VARIANTS.includes(manifest.variant) ||
     manifest.canvas?.width!==512 || manifest.canvas?.height!==512 ||
     !Array.isArray(manifest.slots)) throw new Error('Invalid whiteboard manifest');
  const seen=new Set(),layers={},unsupported=[];
  for(const entry of manifest.slots) {
    if(!entry || !NOVA_MOD_SLOTS.includes(entry.slot) || seen.has(entry.slot))
      throw new Error('Unknown or duplicate whiteboard slot');
    seen.add(entry.slot);
    if(entry.hidden===true || entry.transparent===true) continue;
    if(typeof entry.filename!=='string' || !/^[a-z0-9_-]+\.png$/i.test(entry.filename))
      throw new Error('Invalid image filename');
    if(!LAYER_SLOTS.includes(entry.slot)) {
      unsupported.push(entry.slot);
      continue;
    }
    layers[entry.slot]={operation:'replace',src:entry.filename};
  }
  if(unsupported.length) throw new Error('Unsupported visible whiteboard slots: '+unsupported.join(', '));
  // A whiteboard manifest describes names, not file contents. The caller must
  // verify PNG presence, transparency and image dimensions before rendering.
  const visibleLayers=resolveNovaLayers({variant:manifest.variant,base,mods:[{variant:manifest.variant,layers}],safeOutfit});
  return {variant:manifest.variant,visibleLayers,unsupportedSlots:UNSUPPORTED};
}

// The strict import path verifies visible PNG headers and file presence first.
// Keep the synchronous importer for pure manifest previews and existing callers.
export async function importVerifiedNovaWhiteboardMod(manifest,readAsset,options={}) {
  const resolved=importNovaWhiteboardMod(manifest,options);
  const assets=await validateNovaModAssets(manifest,readAsset);
  return {...resolved,assets};
}
