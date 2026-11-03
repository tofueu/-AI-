import { createNovaAction } from './animation-presets.js';
import { createNovaClip, NOVA_BONES } from './animation-timeline.js';

// Existing action presets use legacy rig names; translate without changing artist assets.
const LEGACY_BONES = Object.freeze({
  upper_leg_l:'thigh_l', upper_leg_r:'thigh_r',
  lower_leg_l:'shin_l', lower_leg_r:'shin_r',
  upper_arm_l:'arm_l', upper_arm_r:'arm_r',
  lower_arm_l:'forearm_l', lower_arm_r:'forearm_r',
});
const ACTION_NAMES = Object.freeze({typing:'type',run:'walk',sleep:'idle'});
export function convertNovaActionToClip(action) {
  if (!action || !Array.isArray(action.keyframes)) throw new Error('Invalid NOVA action');
  const name = ACTION_NAMES[action.name] ?? action.name;
  const frames = action.keyframes.map(({time,bones}) => {
    if (!bones || typeof bones !== 'object' || Array.isArray(bones)) throw new Error('Invalid NOVA action bones');
    const pose = {};
    for (const [source,transform] of Object.entries(bones)) {
      const target = LEGACY_BONES[source] ?? source;
      if (!NOVA_BONES.includes(target) || Object.hasOwn(pose,target)) throw new Error('Invalid or duplicate NOVA bone: '+source);
      pose[target] = transform;
    }
    return {timeMs:time,pose};
  });
  return createNovaClip({variant:action.variant,name,durationMs:action.duration,loop:action.loop,frames});
}
export function createNovaPresetClip(variant,actionName) {
  return convertNovaActionToClip(createNovaAction(variant,actionName));
}
