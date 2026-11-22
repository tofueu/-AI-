/** Convert sampled joint poses into immutable renderer-ready layer transforms.
 * Layer assets remain references: this module never rewrites original PNG/PSD files.
 */
import {normalizePose, NOVA_VARIANTS} from './rig-interpolation.js';

const DEFAULT = Object.freeze({x:0,y:0,rotation:0,scaleX:1,scaleY:1});
const SLOT = /^[a-z][a-z0-9_]*$/i;
function finite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Invalid '+label);
  return value;
}
export function bindPoseToLayers({variant,layers,pose={},joints={}}) {
  if (!NOVA_VARIANTS.includes(variant)) throw new TypeError('Invalid variant');
  if (!Array.isArray(layers)) throw new TypeError('Invalid layers');
  if (!joints || typeof joints !== 'object' || Array.isArray(joints)) throw new TypeError('Invalid joints');
  const normalized = normalizePose(pose);
  const seen = new Set();
  return layers.map(layer => {
    if (!layer || typeof layer !== 'object' || !SLOT.test(layer.slot) || seen.has(layer.slot)) throw new TypeError('Invalid or duplicate layer slot');
    seen.add(layer.slot);
    if (typeof layer.src !== 'string' || !layer.src.trim()) throw new TypeError('Missing layer source');
    const joint = joints[layer.slot] ?? layer.slot;
    if (typeof joint !== 'string' || !SLOT.test(joint)) throw new TypeError('Invalid joint binding');
    const pivot = layer.pivot ?? {x:0,y:0};
    if (!pivot || typeof pivot !== 'object') throw new TypeError('Invalid pivot');
    const x = finite(pivot.x ?? 0,'pivot x'), y = finite(pivot.y ?? 0,'pivot y');
    return {
      slot:layer.slot,src:layer.src,joint,
      pivot:{x,y},
      transform:{...DEFAULT,...(normalized[joint]??{})}
    };
  });
}

export function bindAnimationToLayers({variant,layers,frames,joints={}}) {
  if (!Array.isArray(frames) || !frames.length || frames.length > 10000) throw new RangeError('Invalid frames');
  return frames.map((frame,index) => {
    if (!frame || !Number.isFinite(frame.timeMs) || frame.timeMs < 0) throw new TypeError('Invalid frame time');
    return {index,timeMs:frame.timeMs,layers:bindPoseToLayers({variant,layers,pose:frame.pose,joints})};
  });
}
