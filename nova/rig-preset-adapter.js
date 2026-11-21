import {createNovaAction, NOVA_ACTION_NAMES} from './animation-presets.js';
import {buildAnimationFrames} from './animation-frames.js';

/** Adapt existing NOVA bone presets to normalized rig clips without altering source assets. */
export function createNovaRigClip(variant, action) {
  if (!NOVA_ACTION_NAMES.includes(action)) throw new TypeError('Unknown NOVA action');
  const preset = createNovaAction(variant, action);
  if (!Number.isFinite(preset.duration) || preset.duration <= 0) throw new RangeError('Invalid preset duration');
  return {
    variant,
    action,
    durationMs: preset.duration,
    loop: preset.loop === true,
    frames: preset.keyframes.map(({time, bones}) => ({
      at: time / preset.duration,
      pose: Object.fromEntries(Object.entries(bones).map(([joint, channels]) => [joint, {...channels}])),
    })),
  };
}
export function sampleNovaActionFrames(variant, action, options = {}) {
  return buildAnimationFrames(createNovaRigClip(variant, action), options);
}
