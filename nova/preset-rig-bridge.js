// Convert existing NOVA action presets into the 16-joint SVG renderer format.
// Preserve source presets and artist assets. Rotation values are degrees.
import {createNovaAction} from './animation-presets.js';
import {RIG_JOINTS,validateClip} from './rig-animation.js';
const MAP=Object.freeze({
  upper_arm_l:'shoulder_l',upper_arm_r:'shoulder_r',
  lower_arm_l:'elbow_l',lower_arm_r:'elbow_r',
  upper_leg_l:'hip_l',upper_leg_r:'hip_r',
  lower_leg_l:'knee_l',lower_leg_r:'knee_r'
});
const zero=()=>({x:0,y:0,rotation:0});
export function convertPresetToRigClip(action) {
  if(!action || !Array.isArray(action.keyframes) || !Number.isFinite(action.duration) || action.duration<=0) throw new Error('Invalid preset');
  const frames=action.keyframes.map(frame=>{
    const pose=Object.fromEntries(RIG_JOINTS.map(j=>[j,zero()]));
    if(!frame || !Number.isFinite(frame.time) || !frame.bones || typeof frame.bones!=='object') throw new Error('Invalid preset frame');
    for(const [name,transform] of Object.entries(frame.bones)){
      const target=MAP[name]??name;
      if(!RIG_JOINTS.includes(target)) throw new Error('Unsupported preset bone: '+name);
      if(!transform || typeof transform!=='object' || Array.isArray(transform)) throw new Error('Invalid preset transform');
      for(const key of ['x','y','rotation']) if(Object.hasOwn(transform,key)){
        if(typeof transform[key]!=='number'||!Number.isFinite(transform[key])) throw new Error('Invalid preset transform');
        pose[target][key]=transform[key];
      }
    }
    return {time:frame.time/1000,pose};
  });
  if(frames.at(-1)?.time!==action.duration/1000) throw new Error('Preset duration mismatch');
  return validateClip({variant:action.variant,action:action.name,frames});
}
export function createPresetRigClip(variant,actionName) {
  return convertPresetToRigClip(createNovaAction(variant,actionName));
}
