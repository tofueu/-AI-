// Bridge the 20-slot artist whiteboard to the current NOVA MOD runtime.
// Does not pretend a PNG is a Live2D .moc3 model.
import {NOVA_MOD_SLOTS} from './first-sheet-whiteboard.js';
import {LAYER_SLOTS,NOVA_VARIANTS,resolveNovaLayers} from './mod-layers.js';

const MAP=Object.freeze({
  hair_back:'hair_back',body:'body',bottom:'bottom',top:'top',
  head:'head',eyes:'eyes',mouth:'mouth',hair_front:'hair_front',
  hat:'hat',accessory:'accessory'
});
const UNSUPPORTED=Object.freeze(NOVA_MOD_SLOTS.filter(s=>!Object.hasOwn(MAP,s)));

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
    if(!Object.hasOwn(MAP,entry.slot)) {
      unsupported.push(entry.slot);
      continue;
    }
    layers[MAP[entry.slot]]={operation:'replace',src:entry.filename};
  }
  if(unsupported.length) throw new Error('Unsupported visible whiteboard slots: '+unsupported.join(', '));
  const visibleLayers=resolveNovaLayers({variant:manifest.variant,base,mods:[{variant:manifest.variant,layers}],safeOutfit});
  return {variant:manifest.variant,visibleLayers,unsupportedSlots:UNSUPPORTED};
}
