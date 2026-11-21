import {sampleNovaActionFrames} from './rig-preset-adapter.js';

/**
 * Produce renderer-neutral transform commands for each sampled pose.
 * Art assets and anchors remain owned by the MOD renderer, not this module.
 */
export function createNovaMotionTrack(variant, action, options = {}) {
  const sampled = sampleNovaActionFrames(variant, action, options);
  return {
    variant, action, durationMs: sampled.durationMs, fps: sampled.fps,
    frames: sampled.frames.map(({index, timeMs, pose}) => ({
      index, timeMs,
      joints: Object.fromEntries(Object.entries(pose).map(([name, channels]) => [
        name, {
          translateX: channels.x,
          translateY: channels.y,
          rotateDeg: channels.rotation,
          scaleX: channels.scaleX,
          scaleY: channels.scaleY,
        },
      ])),
    })),
  };
}
