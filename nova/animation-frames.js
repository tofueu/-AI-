import {sampleAnimation, NOVA_VARIANTS} from './rig-interpolation.js';

/** Deterministic pose frames for renderers/GIF encoders; no image assets are modified. */
export function buildAnimationFrames(animation, {fps=12, includeEndpoint=false}={}) {
  if (!animation || typeof animation !== 'object') throw new TypeError('Invalid animation');
  if (!NOVA_VARIANTS.includes(animation.variant)) throw new TypeError('Invalid variant');
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) throw new RangeError('FPS must be 1..120');
  if (!Number.isFinite(animation.durationMs) || animation.durationMs <= 0) throw new RangeError('Invalid duration');
  if (typeof includeEndpoint !== 'boolean') throw new TypeError('Invalid endpoint option');
  const count = Math.round(animation.durationMs * fps / 1000);
  if (count < 2 || count > 10000) throw new RangeError('Frame count must be 2..10000');
  const frames = [];
  for (let i=0;i<count;i++) {
    const timeMs = i * animation.durationMs / count;
    frames.push({index:i,timeMs,pose:sampleAnimation(animation,timeMs)});
  }
  if (includeEndpoint) frames.push({index:count,timeMs:animation.durationMs,pose:sampleAnimation({...animation,loop:false},animation.durationMs)});
  return {variant:animation.variant,durationMs:animation.durationMs,fps,frames};
}
