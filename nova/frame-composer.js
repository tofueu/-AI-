// Compose MOD resolution and live AI task poses without mutating artwork.
// The returned draw records are renderer-neutral; artwork is loaded by the caller.
import {resolveNovaLayers} from './mod-layers.js';
import {sampleNovaTask} from './task-motion-adapter.js';
import {bindNovaLayersToPose} from './layer-pose.js';

export function composeNovaFrame({variant,base={},mods=[],safeOutfit={},state='idle',elapsedSeconds=0,loop=true}) {
  const layers=resolveNovaLayers({variant,base,mods,safeOutfit});
  const sampled=sampleNovaTask({variant,state,elapsedSeconds,loop});
  const draw=bindNovaLayersToPose({variant,layers,pose:sampled.pose});
  return {variant,state,action:sampled.action,time:sampled.time,duration:sampled.duration,layers:draw};
}
