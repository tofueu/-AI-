// Map MOD image layers to an animated rig without mutating source assets.
import { RIG_JOINTS, RIG_VARIANTS } from './rig-animation.js';

export const DEFAULT_LAYER_JOINTS = Object.freeze({
  body:'torso', torso:'torso', head:'head', face:'head', eyes:'head', mouth:'head',
  hair:'head', hair_front:'head', hair_back:'head', hat:'head', accessory:'head',
  top:'torso', bottom:'hip_l', dress:'torso', shoes_l:'ankle_l', shoes_r:'ankle_r',
  arm_l:'shoulder_l', arm_r:'shoulder_r', hand_l:'wrist_l', hand_r:'wrist_r',
  leg_l:'hip_l', leg_r:'hip_r'
});
const finite = v => typeof v === 'number' && Number.isFinite(v);
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);

/** Bind visible image layers to sampled joint transforms for a renderer. */
export function bindRigLayers(sample, layers, { joints = DEFAULT_LAYER_JOINTS } = {}) {
  if (!sample || !RIG_VARIANTS.includes(sample.variant) || !sample.pose || typeof sample.pose !== 'object') throw new Error('Invalid rig sample');
  if (!layers || typeof layers !== 'object' || Array.isArray(layers)) throw new Error('Invalid layer map');
  if (!joints || typeof joints !== 'object' || Array.isArray(joints)) throw new Error('Invalid joint map');
  const output = [];
  for (const [slot, layer] of Object.entries(layers)) {
    if (!layer || typeof layer !== 'object' || Array.isArray(layer)) throw new Error('Invalid layer: ' + slot);
    if (layer.hidden === true || layer.transparent === true || layer.operation === 'hide') continue;
    if (layer.hidden !== undefined && layer.hidden !== false || layer.transparent !== undefined && layer.transparent !== false) throw new Error('Invalid visibility: ' + slot);
    const joint = own(joints,slot) ? joints[slot] : 'root';
    if (!RIG_JOINTS.includes(joint)) throw new Error('Invalid joint binding: ' + slot);
    const transform = sample.pose[joint];
    if (!transform || !['x','y','rotation'].every(k=>finite(transform[k]))) throw new Error('Missing joint transform: ' + joint);
    const src = layer.src ?? layer.image ?? layer.path;
    if (typeof src !== 'string' || !src.trim()) throw new Error('Missing image source: ' + slot);
    const offset = layer.offset ?? {x:0,y:0,rotation:0};
    if (!offset || typeof offset !== 'object' || Array.isArray(offset) || !['x','y','rotation'].every(k=>finite(offset[k]))) throw new Error('Invalid layer offset: ' + slot);
    // Root translation is inherited by all attached parts. Without this, idle/walk\n    // bobbing moves only root-bound layers and the character appears disjointed.\n    const root = sample.pose.root;\n    if (!root || !['x','y','rotation'].every(k=>finite(root[k]))) throw new Error('Missing root transform');\n    const inherited = joint === 'root' ? {x:0,y:0} : root;\n    output.push({slot,src, joint, x:inherited.x+transform.x+offset.x, y:inherited.y+transform.y+offset.y, rotation:transform.rotation+offset.rotation});
  }
  return output;
}
