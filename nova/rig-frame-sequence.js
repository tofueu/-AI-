import { sampleClip, validateClip } from './rig-animation.js';

// Renderer-independent fixed-rate frames for future GIF/PNG sprite export.
// The duplicate endpoint is excluded to avoid a pause at the loop seam.
export function buildRigFrameSequence(clip, { fps = 24, cycles = 1 } = {}) {
  validateClip(clip);
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) throw new RangeError('fps must be an integer from 1 to 120');
  if (!Number.isInteger(cycles) || cycles < 1 || cycles > 100) throw new RangeError('cycles must be an integer from 1 to 100');
  const duration = clip.frames.at(-1).time;
  const framesPerCycle = Math.max(2, Math.round(duration * fps));
  if (framesPerCycle * cycles > 12000) throw new RangeError('too many animation frames');
  const frames = [];
  for (let i = 0; i < framesPerCycle * cycles; i++) {
    const time = (i % framesPerCycle) * duration / framesPerCycle;
    const sampled = sampleClip(clip, time, { loop: true });
    frames.push({ index: i, time: i * duration / framesPerCycle, pose: sampled.pose });
  }
  return { variant: clip.variant, fps: framesPerCycle / duration, frameDurationMs: duration * 1000 / framesPerCycle, cycleDuration: duration, framesPerCycle, frames };
}
