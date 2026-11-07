// Deterministic, seam-safe motion frame sampling for NOVA MOD renderers.
// Output is pose data, not finished character artwork.
import {NOVA_MOTION_PRESETS, sampleNovaPreset} from './rig-motion-presets.js';

export function buildNovaPresetFrames({variant, action, fps=12, cycles=1}={}) {
  if (!['chibi','adult'].includes(variant)) throw new Error('Invalid NOVA variant');
  if (!Object.hasOwn(NOVA_MOTION_PRESETS,action)) throw new Error('Unknown NOVA action');
  if (!Number.isInteger(fps)||fps<1||fps>60||!Number.isInteger(cycles)||cycles<1||cycles>20)
    throw new Error('Invalid NOVA sampling options');
  const durationMs=NOVA_MOTION_PRESETS[action].at(-1).atMs;
  const count=Math.round(durationMs*fps*cycles/1000);
  if(count<2||count>7200) throw new Error('Invalid NOVA frame count');
  // Do not duplicate the first pose at the end: GIF/video loop boundaries remain smooth.
  const frames=Array.from({length:count},(_,index)=>{
    const timeMs=index*durationMs*cycles/count;
    return {index,timeMs,pose:sampleNovaPreset(variant,action,timeMs).pose};
  });
  return {variant,action,fps,cycles,durationMs:durationMs*cycles,frames};
}
