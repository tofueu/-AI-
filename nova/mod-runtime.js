// Integrates resolved MOD layers with a sampled NOVA rig without mutating either.
import {resolveNovaLayers} from './mod-layers.js';
import {sampleRig,composeRigWorld,bindModLayers} from './rig2d.js';
export function renderNovaPose({variant,base,mods=[],safeOutfit,rig,action,timeMs=0}) {
  if (!rig || rig.variant!==variant) throw new Error('Rig variant mismatch');
  const layers=resolveNovaLayers({variant,base,mods,safeOutfit});
  const world=composeRigWorld(sampleRig(rig,action,timeMs));
  return {variant,timeMs,layers:bindModLayers(layers,world)};
}
