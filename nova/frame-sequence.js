import {renderNovaPoseSvg} from './pose-mod-preview.js';

/**
 * Export deterministic, sequential SVG animation frames for either NOVA rig.
 * This is an intermediate frame sequence, not a GIF/PNG encoder.
 * Each frame is sampled at its start time; a looping clip never duplicates
 * the final pose at durationMs.
 */
export function renderNovaFrameSequence(base, mod, clip, options={}) {
  const {fps=12, cycles=1, ...renderOptions}=options;
  if (!Number.isInteger(fps) || fps<1 || fps>60) throw new Error('fps must be an integer from 1 to 60');
  if (!Number.isInteger(cycles) || cycles<1 || cycles>10) throw new Error('cycles must be an integer from 1 to 10');
  if (!clip || !Number.isFinite(clip.durationMs) || clip.durationMs<=0) throw new Error('Invalid clip duration');
  if (cycles>1 && clip.loop!==true) throw new Error('Multiple cycles require a looping clip');
  const frameCount=Math.ceil(clip.durationMs*fps/1000)*cycles;
  if (frameCount>600) throw new Error('Frame sequence exceeds 600 frames');
  const frames=[];
  for(let i=0;i<frameCount;i++){
    const timeMs=i*1000/fps;
    const frame=renderNovaPoseSvg(base,mod,clip,timeMs,renderOptions);
    frames.push({index:i,timeMs,svg:frame.svg,fallbacks:frame.fallbacks});
  }
  return {variant:clip.variant,name:clip.name,fps,cycles,frameCount,frames};
}
