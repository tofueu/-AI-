// Deterministic SVG animation frame sequence for export and preview tools.
// Assets remain external; this module never modifies original MOD layers.
import {validateClip} from './rig-animation.js';
import {renderNovaSvgFrame} from './svg-frame.js';

export function exportNovaSvgSequence(clip, layers, {fps=12, maxFrames=240, svgOptions={}}={}) {
  validateClip(clip);
  if (!Number.isInteger(fps) || fps < 1 || fps > 60) throw new Error('Invalid animation FPS');
  if (!Number.isInteger(maxFrames) || maxFrames < 1 || maxFrames > 3600) throw new Error('Invalid frame limit');
  const duration = clip.frames[clip.frames.length-1].time;
  const count = Math.ceil(duration * fps);
  if (count > maxFrames) throw new Error('Animation exceeds frame limit');
  const frames = Array.from({length:count}, (_,index) => ({
    index,
    time:index/fps,
    filename:`frame-${String(index).padStart(4,'0')}.svg`,
    svg:renderNovaSvgFrame(clip,layers,index/fps,{...svgOptions,loop:false})
  }));
  return {variant:clip.variant,action:clip.action ?? null,fps,duration,frames};
}
