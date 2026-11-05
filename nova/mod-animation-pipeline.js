// End-to-end composition of a resolved NOVA MOD with an existing preset.
// Pure data pipeline: does not alter the base artwork or require a desktop window.
import {resolveNovaLayers} from './mod-layers.js';
import {modLayersToRigMap} from './mod-rig-adapter.js';
import {createPresetRigClip} from './preset-rig-bridge.js';
import {exportNovaSvgSequence} from './svg-sequence.js';

export function buildNovaModAnimation({variant,action,base={},mods=[],safeOutfit={},fps=12,maxFrames=240,svgOptions={}}) {
  if (typeof action!=='string' || !action.trim()) throw new Error('NOVA action is required');
  const resolved=resolveNovaLayers({variant,base,mods,safeOutfit});
  const layers=modLayersToRigMap(resolved);
  const clip=createPresetRigClip(variant,action);
  return exportNovaSvgSequence(clip,layers,{fps,maxFrames,svgOptions});
}
