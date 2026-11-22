import { NOVA_MOD_SLOTS } from './mod-slot-template.js';

// Deterministic, non-mutating keyframe interpolation for both NOVA rigs.
// A pose is keyed by MOD slot, each value containing x/y (pixels), rotation (degrees),
// scaleX/scaleY (unitless), and opacity (0..1).
const DEFAULT = Object.freeze({ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 });
const FIELDS = Object.keys(DEFAULT);
function validatePose(pose) {
  if (!pose || typeof pose !== 'object' || Array.isArray(pose)) throw new TypeError('Invalid pose');
  for (const [slot, transform] of Object.entries(pose)) {
    if (!NOVA_MOD_SLOTS.includes(slot)) throw new TypeError('Unknown pose slot');
    if (!transform || typeof transform !== 'object' || Array.isArray(transform)) throw new TypeError('Invalid transform');
    for (const [key, value] of Object.entries(transform)) {
      if (!FIELDS.includes(key) || typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Invalid transform field');
      if (key === 'opacity' && (value < 0 || value > 1)) throw new RangeError('Invalid opacity');
      if ((key === 'scaleX' || key === 'scaleY') && value <= 0) throw new RangeError('Invalid scale');
    }
  }
}
export function interpolateNovaPose(from, to, progress) {
  validatePose(from);
  validatePose(to);
  if (typeof progress !== 'number' || !Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new RangeError('Progress must be between 0 and 1');
  }
  const result = {};
  for (const slot of NOVA_MOD_SLOTS) {
    if (!Object.hasOwn(from, slot) && !Object.hasOwn(to, slot)) continue;
    const a = { ...DEFAULT, ...(from[slot] ?? {}) };
    const b = { ...DEFAULT, ...(to[slot] ?? {}) };
    result[slot] = Object.fromEntries(FIELDS.map(field => [field, a[field] + (b[field] - a[field]) * progress]));
  }
  return result;
}
export function sampleNovaAnimation({ variant, keyframes, frameCount, loop = false } = {}) {
  if (!['chibi', 'adult'].includes(variant)) throw new TypeError('Invalid NOVA variant');
  if (!Array.isArray(keyframes) || keyframes.length < 2 || keyframes.length > 256) throw new RangeError('Invalid keyframes');
  if (!Number.isInteger(frameCount) || frameCount < 2 || frameCount > 1000) throw new RangeError('Invalid frame count');
  if (typeof loop !== 'boolean') throw new TypeError('Invalid loop');
  for (const frame of keyframes) {
    if (!frame || typeof frame !== 'object' || typeof frame.at !== 'number' || !Number.isFinite(frame.at)) throw new TypeError('Invalid keyframe');
    validatePose(frame.pose);
  }
  if (keyframes[0].at !== 0 || keyframes[keyframes.length - 1].at !== 1 ||
      keyframes.some((frame, i) => i > 0 && frame.at <= keyframes[i - 1].at)) {
    throw new RangeError('Keyframe times must increase strictly from 0 to 1');
  }
  const samples = [];
  for (let i = 0; i < frameCount; i++) {
    const t = loop ? i / frameCount : i / (frameCount - 1);
    let j = 0;
    while (j < keyframes.length - 2 && t > keyframes[j + 1].at) j++;
    const left = keyframes[j], right = keyframes[j + 1];
    samples.push({ at: t, pose: interpolateNovaPose(left.pose, right.pose, (t - left.at) / (right.at - left.at)) });
  }
  return { variant, loop, frames: samples };
}
