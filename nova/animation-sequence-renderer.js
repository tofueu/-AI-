import { sampleNovaAnimation } from './pose-interpolator.js';
import { renderNovaAnimationFrame } from './animation-frame-renderer.js';

// Render every sampled frame for a single rig, preserving the original layer data.
export function renderNovaAnimationSequence(basePose, animation, options = {}) {
  if (!basePose || !['chibi', 'adult'].includes(basePose.variant) ||
      !Array.isArray(basePose.layers)) throw new TypeError('Invalid base NOVA pose');
  if (!animation || animation.variant !== basePose.variant) {
    throw new TypeError('Animation variant must match base pose');
  }
  const sampled = sampleNovaAnimation(animation);
  const frames = sampled.frames.map(frame => renderNovaAnimationFrame(basePose, frame, options));
  return { variant: sampled.variant, loop: sampled.loop, frames,
    timestamps: sampled.frames.map(frame => frame.at) };
}
