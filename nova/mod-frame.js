// Compose the MOD resolver with the animated renderer in a single, side-effect-free entry point.
// No base art, imported MOD, or rig is mutated.
import {resolveNovaLayers} from './mod-layers.js';
import {createNovaDrawCommands} from './layer-renderer.js';

export function createNovaModFrame({rig,base={},mods=[],safeOutfit={},motionName,timeMs,slotBones}={}) {
  if(!rig || !['chibi','adult'].includes(rig.variant)) throw new Error('Invalid NOVA rig variant');
  const layers=resolveNovaLayers({variant:rig.variant,base,mods,safeOutfit});
  return createNovaDrawCommands(rig,layers,motionName,timeMs,
    slotBones===undefined ? undefined : {slotBones});
}
